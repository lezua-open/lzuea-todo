from __future__ import annotations

from fastapi import Request

from app.core.context import AppContext


def get_context(request: Request) -> AppContext:
    ctx = getattr(request.app.state, "ctx", None)
    if ctx is None:
        raise RuntimeError("AppContext 未初始化：请检查 app/main.py 是否正确设置 lifespan/startup")
    return ctx

