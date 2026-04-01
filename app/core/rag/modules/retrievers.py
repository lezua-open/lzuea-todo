from __future__ import annotations

import re
from dataclasses import dataclass
from typing import List, Tuple

from ..schema import Chunk, Embedder, Retriever
from .vector_stores import ChromaVectorStore


@dataclass(frozen=True)
class KeywordRetriever(Retriever):
    chunks: List[Chunk]

    def retrieve(self, query: str, top_k: int = 3) -> List[Chunk]:
        query_tokens = self._tokenize(query)
        if not query_tokens:
            return []

        scored: List[Tuple[int, Chunk]] = []
        for ch in self.chunks:
            sc = self._score(query_tokens, ch)
            if sc > 0:
                scored.append((sc, ch))

        scored.sort(key=lambda x: x[0], reverse=True)
        return [c for _, c in scored[: max(1, top_k)]]

    def _tokenize(self, s: str) -> List[str]:
        tokens = re.findall(r"[\u4e00-\u9fff]|[a-zA-Z0-9]+", (s or "").lower())
        return [t for t in tokens if t.strip()]

    def _score(self, query_tokens: List[str], chunk: Chunk) -> int:
        t = (chunk.content or "").lower()
        sn = (chunk.source or "").lower()
        score = 0
        for qt in query_tokens:
            score += t.count(qt)
            if qt in sn:
                score += 5
        return score


@dataclass(frozen=True)
class VectorRetriever(Retriever):
    vector_store: ChromaVectorStore
    embedder: Embedder

    def retrieve(self, query: str, top_k: int = 3) -> List[Chunk]:
        q = (query or "").strip()
        if not q:
            return []
        query_vec = self.embedder.embed_query(q)
        return self.vector_store.query(query_vec, top_k=top_k)
