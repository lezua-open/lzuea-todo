from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Protocol


@dataclass(frozen=True)
class Document:
    content: str
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class Chunk:
    source: str
    content: str
    metadata: Dict[str, Any] = field(default_factory=dict)


class Loader(Protocol):
    def load(self) -> List[Document]: ...


class Splitter(Protocol):
    def split(self, documents: List[Document]) -> List[Chunk]: ...


class Embedder(Protocol):
    def embed_query(self, query: str) -> List[float]: ...

    def embed_documents(self, texts: List[str]) -> List[List[float]]: ...


class Retriever(Protocol):
    def retrieve(self, query: str, top_k: int = 3) -> List[Chunk]: ...


class PromptBuilder(Protocol):
    def build_context(self, chunks: List[Chunk]) -> str: ...

    def build_rag_system_message(self, context_text: str) -> Dict[str, str]: ...


@dataclass(frozen=True)
class RAGResult:
    chunks: List[Chunk]
    context_text: str
    sources: List[str]

