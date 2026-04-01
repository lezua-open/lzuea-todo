from __future__ import annotations

import logging
import time
from typing import Dict, List, Optional, Tuple

from .modules.embeddings import SentenceTransformerEmbedder
from .modules.loaders import MarkdownDirectoryLoader
from .modules.prompt_builders import StrictRAGPromptBuilder
from .modules.retrievers import KeywordRetriever, VectorRetriever
from .modules.splitters import MarkdownParagraphSplitter
from .modules.vector_stores import ChromaVectorStore
from .schema import Chunk, Embedder, PromptBuilder, RAGResult, Retriever

logger = logging.getLogger(__name__)


class RAGPipeline:
    def __init__(
        self,
        kb_dir: str,
        retriever_mode: str = "vector",
        chroma_persist_dir: Optional[str] = None,
        embedding_model: str = "all-MiniLM-L6-v2",
        splitter_max_chars: int = 800,
        splitter_overlap: int = 120,
        prompt_builder: Optional[PromptBuilder] = None,
    ):
        self.kb_dir = kb_dir
        self.retriever_mode = retriever_mode
        self.chroma_persist_dir = chroma_persist_dir
        self.embedding_model = embedding_model
        self.splitter_max_chars = splitter_max_chars
        self.splitter_overlap = splitter_overlap
        self.prompt_builder: PromptBuilder = prompt_builder or StrictRAGPromptBuilder()
        self.retriever: Optional[Retriever] = None

    def initialize(self) -> None:
        start = time.perf_counter()
        loader = MarkdownDirectoryLoader(self.kb_dir)
        splitter = MarkdownParagraphSplitter(
            max_chars=self.splitter_max_chars,
            overlap=self.splitter_overlap,
        )

        documents = loader.load()
        chunks = splitter.split(documents)

        if self.retriever_mode == "vector" and self.chroma_persist_dir:
            try:
                embedder = SentenceTransformerEmbedder(model_name=self.embedding_model)
                v_store = ChromaVectorStore(persist_dir=self.chroma_persist_dir)

                # 如果向量库是空的，则索引
                if v_store.count() == 0:
                    logger.info("Chroma collection is empty, indexing chunks...")
                    embeddings = embedder.embed_documents([c.content for c in chunks])
                    v_store.upsert_chunks(chunks, embeddings)

                self.retriever = VectorRetriever(vector_store=v_store, embedder=embedder)
                logger.info("Using VectorRetriever (Chroma)")
            except Exception as e:
                logger.error(f"Failed to initialize VectorRetriever: {e}. Falling back to KeywordRetriever.")
                self.retriever = KeywordRetriever(chunks)
        else:
            self.retriever = KeywordRetriever(chunks)
            logger.info("Using KeywordRetriever")

        cost_ms = int((time.perf_counter() - start) * 1000)
        logger.info(
            "RAG initialized: mode=%s documents=%d chunks=%d cost_ms=%d",
            self.retriever_mode,
            len(documents),
            len(chunks),
            cost_ms,
        )

    def refresh(self) -> dict:
        """清空并重新索引知识库文件"""
        start = time.perf_counter()

        loader = MarkdownDirectoryLoader(self.kb_dir)
        splitter = MarkdownParagraphSplitter(
            max_chars=self.splitter_max_chars,
            overlap=self.splitter_overlap,
        )
        documents = loader.load()
        chunks = splitter.split(documents)

        if self.retriever_mode == "vector" and self.chroma_persist_dir:
            try:
                embedder = SentenceTransformerEmbedder(model_name=self.embedding_model)
                v_store = ChromaVectorStore(persist_dir=self.chroma_persist_dir)
                v_store.clear()  # 清空旧数据
                embeddings = embedder.embed_documents([c.content for c in chunks])
                v_store.upsert_chunks(chunks, embeddings)
                self.retriever = VectorRetriever(vector_store=v_store, embedder=embedder)
                logger.info("RAG re-indexed successfully")
                cost_ms = int((time.perf_counter() - start) * 1000)
                return {
                    "status": "ok",
                    "documents": len(documents),
                    "chunks": len(chunks),
                    "cost_ms": cost_ms,
                }
            except Exception as e:
                logger.error(f"Failed to refresh RAG: {e}")
                raise
        else:
            self.retriever = KeywordRetriever(chunks)
            cost_ms = int((time.perf_counter() - start) * 1000)
            return {
                "status": "ok",
                "documents": len(documents),
                "chunks": len(chunks),
                "cost_ms": cost_ms,
                "mode": "keyword",
            }

    def search(self, query: str, top_k: int = 3) -> RAGResult:
        if self.retriever is None:
            self.initialize()

        assert self.retriever is not None
        chunks = self.retriever.retrieve(query, top_k=top_k)

        sources = sorted(list({c.source for c in chunks}))
        context_text = self.prompt_builder.build_context(chunks)

        logger.info(
            "RAG search: mode=%s top_k=%d hits=%d sources=%d",
            self.retriever_mode,
            top_k,
            len(chunks),
            len(sources),
        )

        return RAGResult(chunks=chunks, context_text=context_text, sources=sources)

    def build_rag_system_message(self, context_text: str) -> Dict[str, str]:
        return self.prompt_builder.build_rag_system_message(context_text)

    def augment_messages_with_rag(
        self,
        history: List[Dict[str, str]],
        query: str,
        top_k: int,
    ) -> Tuple[List[Dict[str, str]], RAGResult]:
        rag_result = self.search(query, top_k=top_k)
        if not rag_result.context_text:
            return history, rag_result

        rag_message = self.build_rag_system_message(rag_result.context_text)
        if not history:
            return [rag_message], rag_result

        return [history[0], rag_message] + history[1:], rag_result
