import os
from typing import List

from app.core.rag.pipeline import RAGPipeline
from app.core.rag.schema import Chunk

KB_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "knowledge_base")

_pipeline: RAGPipeline | None = None


def _get_pipeline() -> RAGPipeline:
    global _pipeline
    if _pipeline is None:
        _pipeline = RAGPipeline(KB_DIR)
    return _pipeline


def retrieve(query: str, top_k: int = 3) -> List[Chunk]:
    """兼容旧接口：返回 Chunk 列表。"""
    return _get_pipeline().search(query, top_k=top_k).chunks


def format_context(chunks: List[Chunk]) -> str:
    """兼容旧接口：格式化上下文。"""
    return _get_pipeline().format_context(chunks)

