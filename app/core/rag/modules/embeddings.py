from __future__ import annotations

from dataclasses import dataclass
from typing import List

from sentence_transformers import SentenceTransformer

from ..schema import Embedder


@dataclass
class SentenceTransformerEmbedder(Embedder):
    model_name: str = "all-MiniLM-L6-v2"

    def __post_init__(self) -> None:
        self._model = SentenceTransformer(self.model_name)

    def embed_query(self, query: str) -> List[float]:
        vec = self._model.encode([query], normalize_embeddings=True)[0]
        return vec.tolist()

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        vecs = self._model.encode(texts, normalize_embeddings=True)
        return [v.tolist() for v in vecs]

