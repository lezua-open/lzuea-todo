from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from typing import Iterable, List, Optional

from app.core.config import (
    CHAT_DEFAULT_PROMPT_TEMPLATE,
    CHAT_DEFAULT_RAG_TOP_K,
    CHAT_DEFAULT_USE_RAG,
    CHAT_MAX_TURNS,
    RAG_NO_HIT_REPLY,
)
from app.core.llm import chat_messages, chat_messages_stream
from app.core.prompt import build_system_message
from app.core.rag.pipeline import RAGPipeline
from app.core.session_store import SessionStore

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class ChatRequest:
    question: str
    session_id: str
    prompt_template: Optional[str] = None
    use_rag: Optional[bool] = None
    rag_top_k: Optional[int] = None


@dataclass(frozen=True)
class ChatResponse:
    answer: str
    session_id: str
    sources: List[str]


class ChatService:
    def __init__(self, session_store: SessionStore, rag_pipeline: RAGPipeline):
        self.session_store = session_store
        self.rag_pipeline = rag_pipeline

    def handle(self, req: ChatRequest) -> ChatResponse:
        session_id = req.session_id or "default"
        prompt_template = req.prompt_template or CHAT_DEFAULT_PROMPT_TEMPLATE
        use_rag = CHAT_DEFAULT_USE_RAG if req.use_rag is None else req.use_rag
        rag_top_k = req.rag_top_k if req.rag_top_k is not None else CHAT_DEFAULT_RAG_TOP_K

        system_message = build_system_message(prompt_template)

        history = self.session_store.get_or_create(session_id, system_message)
        self.session_store.append(session_id, {"role": "user", "content": req.question})

        sources: List[str] = []
        history_to_send = history

        if use_rag:
            history_to_send, rag_result = self.rag_pipeline.augment_messages_with_rag(
                history=history,
                query=req.question,
                top_k=rag_top_k,
            )
            sources = rag_result.sources

            if not rag_result.context_text:
                logger.info("RAG no-hit: session_id=%s", session_id)
                return ChatResponse(
                    answer=RAG_NO_HIT_REPLY,
                    session_id=session_id,
                    sources=[],
                )

        max_messages = 2 + CHAT_MAX_TURNS * 2
        if len(history_to_send) > max_messages:
            history_to_send = [history_to_send[0]] + history_to_send[-(max_messages - 1) :]

        answer = chat_messages(history_to_send)
        self.session_store.append(session_id, {"role": "assistant", "content": answer})

        return ChatResponse(answer=answer, session_id=session_id, sources=sources)

    def handle_stream(self, req: ChatRequest) -> Iterable[str]:
        """返回 SSE 字符串迭代器。默认事件：

        - data: {"type":"meta","session_id":...,"sources":[...]}
        - data: {"type":"delta","content":"..."}
        - data: {"type":"done"}
        """
        session_id = req.session_id or "default"
        prompt_template = req.prompt_template or CHAT_DEFAULT_PROMPT_TEMPLATE
        use_rag = CHAT_DEFAULT_USE_RAG if req.use_rag is None else req.use_rag
        rag_top_k = req.rag_top_k if req.rag_top_k is not None else CHAT_DEFAULT_RAG_TOP_K

        system_message = build_system_message(prompt_template)

        history = self.session_store.get_or_create(session_id, system_message)
        self.session_store.append(session_id, {"role": "user", "content": req.question})

        sources: List[str] = []
        history_to_send = history

        if use_rag:
            history_to_send, rag_result = self.rag_pipeline.augment_messages_with_rag(
                history=history,
                query=req.question,
                top_k=rag_top_k,
            )
            sources = rag_result.sources

            if not rag_result.context_text:
                payload = {
                    "type": "meta",
                    "session_id": session_id,
                    "sources": [],
                }
                yield f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"

                payload = {
                    "type": "delta",
                    "content": RAG_NO_HIT_REPLY,
                }
                yield f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"

                self.session_store.append(
                    session_id,
                    {"role": "assistant", "content": RAG_NO_HIT_REPLY},
                )
                yield f"data: {json.dumps({'type': 'done'}, ensure_ascii=False)}\n\n"
                return

        max_messages = 2 + CHAT_MAX_TURNS * 2
        if len(history_to_send) > max_messages:
            history_to_send = [history_to_send[0]] + history_to_send[-(max_messages - 1) :]

        meta = {
            "type": "meta",
            "session_id": session_id,
            "sources": sources,
        }
        yield f"data: {json.dumps(meta, ensure_ascii=False)}\n\n"

        buf: List[str] = []
        for delta in chat_messages_stream(history_to_send):
            if not delta:
                continue
            buf.append(delta)
            payload = {
                "type": "delta",
                "content": delta,
            }
            yield f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"

        answer = "".join(buf)
        self.session_store.append(session_id, {"role": "assistant", "content": answer})

        yield f"data: {json.dumps({'type': 'done'}, ensure_ascii=False)}\n\n"
