from __future__ import annotations

from dataclasses import dataclass

from app.core.chat_service import ChatService
from app.core.config import (
    KB_DIR,
    RAG_CHROMA_PERSIST_DIR,
    RAG_EMBEDDING_MODEL,
    RAG_RETRIEVER_MODE,
    RAG_SPLIT_MAX_CHARS,
    RAG_SPLIT_OVERLAP,
)
from app.core.rag.pipeline import RAGPipeline
from app.core.session_store import InMemorySessionStore, SessionStore


@dataclass
class AppContext:
    rag_pipeline: RAGPipeline
    session_store: SessionStore
    chat_service: ChatService


def build_app_context() -> AppContext:
    rag_pipeline = RAGPipeline(
        kb_dir=KB_DIR,
        retriever_mode=RAG_RETRIEVER_MODE,
        chroma_persist_dir=RAG_CHROMA_PERSIST_DIR,
        embedding_model=RAG_EMBEDDING_MODEL,
        splitter_max_chars=RAG_SPLIT_MAX_CHARS,
        splitter_overlap=RAG_SPLIT_OVERLAP,
    )
    session_store = InMemorySessionStore()
    chat_service = ChatService(session_store=session_store, rag_pipeline=rag_pipeline)

    return AppContext(
        rag_pipeline=rag_pipeline,
        session_store=session_store,
        chat_service=chat_service,
    )

