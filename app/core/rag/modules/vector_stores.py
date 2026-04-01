from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

import chromadb

from ..schema import Chunk


@dataclass
class ChromaVectorStore:
    persist_dir: str
    collection_name: str = "knowledge_base"

    def __post_init__(self) -> None:
        os.makedirs(self.persist_dir, exist_ok=True)
        self._client = chromadb.PersistentClient(path=self.persist_dir)
        self._collection = self._client.get_or_create_collection(name=self.collection_name)

    def count(self) -> int:
        return int(self._collection.count())

    def upsert_chunks(self, chunks: List[Chunk], embeddings: List[List[float]]) -> None:
        if len(chunks) != len(embeddings):
            raise ValueError("chunks 与 embeddings 数量不一致")

        ids: List[str] = []
        documents: List[str] = []
        metadatas: List[Dict[str, Any]] = []

        for i, ch in enumerate(chunks):
            ids.append(f"{ch.source}::{ch.metadata.get('chunk_index', i)}")
            documents.append(ch.content)
            meta = dict(ch.metadata)
            meta.setdefault("source", ch.source)
            metadatas.append(meta)

        self._collection.upsert(
            ids=ids,
            documents=documents,
            metadatas=metadatas,
            embeddings=embeddings,
        )

    def clear(self) -> None:
        """清空所有向量数据，强制重新索引"""
        self._client.delete_collection(name=self.collection_name)
        self._collection = self._client.get_or_create_collection(name=self.collection_name)

    def query(self, query_embedding: List[float], top_k: int) -> List[Chunk]:
        res = self._collection.query(
            query_embeddings=[query_embedding],
            n_results=max(1, top_k),
            include=["documents", "metadatas"],
        )

        docs = (res.get("documents") or [[]])[0]
        metas = (res.get("metadatas") or [[]])[0]

        chunks: List[Chunk] = []
        for doc, meta in zip(docs, metas):
            source = str(meta.get("source", "unknown"))
            chunks.append(Chunk(source=source, content=str(doc), metadata=dict(meta)))
        return chunks

