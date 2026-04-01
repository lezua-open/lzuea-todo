from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List

from ..schema import Chunk, PromptBuilder


@dataclass(frozen=True)
class StrictRAGPromptBuilder(PromptBuilder):
    """严格 RAG：必须只基于检索片段回答，片段没有则明确说明。"""

    def build_context(self, chunks: List[Chunk]) -> str:
        if not chunks:
            return ""
        parts: List[str] = []
        for i, ch in enumerate(chunks, start=1):
            parts.append(f"[文档片段 {i}] 来源: {ch.source}\n{ch.content}")
        return "\n\n".join(parts).strip()

    def build_rag_system_message(self, context_text: str) -> Dict[str, str]:
        return {
            "role": "system",
            "content": (
                "你将获得一组检索到的知识片段（带来源）。"
                "一些复杂的数据你可以使用表格来展示，比如一些数据、统计、表格等。"
                "你必须严格只基于这些片段回答用户问题。"
                "如果片段中没有答案，请直接回复‘文档中未包含相关信息’。"
                "回答时不要在每句话后面都加来源。"
                "请在回答末尾添加一个‘来源’小节，列出本次回答使用到的来源文件名（去重即可）。\n\n" + context_text
            ),
        }

