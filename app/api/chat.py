from enum import Enum
from typing import Optional

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.core.chat_service import ChatRequest
from app.core.context import AppContext
from app.deps import get_context

router = APIRouter()


class PromptTemplate(str, Enum):
    chat_system = "chat_system"
    role_assistant = "role_assistant"
    summarizer = "summarizer"


class ChatReq(BaseModel):
    question: str
    session_id: Optional[str] = "default"
    stream: Optional[bool] = None
    use_rag: Optional[bool] = None
    rag_top_k: Optional[int] = None
    prompt_template: Optional[PromptTemplate] = None


@router.post("/rag/refresh")
def rag_refresh_api(ctx: AppContext = Depends(get_context)):
    """重新索引知识库文件，用于文件更新后刷新向量库"""
    result = ctx.rag_pipeline.refresh()
    return result


@router.post("/chat")
def chat_api(req: ChatReq, ctx: AppContext = Depends(get_context)):
    from app.core.config import CHAT_DEFAULT_STREAM

    # 确定是否使用流式，如果请求中没有指定，则使用配置中的默认值
    is_stream = req.stream if req.stream is not None else CHAT_DEFAULT_STREAM

    chat_req = ChatRequest(
        question=req.question,
        session_id=req.session_id or "default",
        prompt_template=str(req.prompt_template) if req.prompt_template else None,
        use_rag=req.use_rag,
        rag_top_k=req.rag_top_k,
    )

    if is_stream:
        return StreamingResponse(
            ctx.chat_service.handle_stream(chat_req),
            media_type="text/event-stream",
        )

    resp = ctx.chat_service.handle(chat_req)
    return {
        "answer": resp.answer,
        "session_id": resp.session_id,
        "sources": resp.sources,
    }
