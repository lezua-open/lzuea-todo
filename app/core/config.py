import os

APP_DIR = os.path.dirname(os.path.dirname(__file__))

KB_DIR = os.getenv("KB_DIR", os.path.join(APP_DIR, "knowledge_base"))

RAG_DEFAULT_TOP_K = int(os.getenv("RAG_DEFAULT_TOP_K", "3"))
RAG_SPLIT_MAX_CHARS = int(os.getenv("RAG_SPLIT_MAX_CHARS", "800"))
RAG_SPLIT_OVERLAP = int(os.getenv("RAG_SPLIT_OVERLAP", "120"))

CHAT_MAX_TURNS = int(os.getenv("CHAT_MAX_TURNS", "10"))

CHAT_DEFAULT_PROMPT_TEMPLATE = os.getenv("CHAT_DEFAULT_PROMPT_TEMPLATE", "summarizer")
CHAT_DEFAULT_USE_RAG = os.getenv("CHAT_DEFAULT_USE_RAG", "true").lower() == "true"
CHAT_DEFAULT_RAG_TOP_K = int(os.getenv("CHAT_DEFAULT_RAG_TOP_K", "3"))
CHAT_DEFAULT_STREAM = os.getenv("CHAT_DEFAULT_STREAM", "true").lower() == "true"

# RAG 策略
RAG_RETRIEVER_MODE = os.getenv("RAG_RETRIEVER_MODE", "vector")  # keyword 或 vector
RAG_CHROMA_PERSIST_DIR = os.getenv("RAG_CHROMA_PERSIST_DIR", os.path.join(APP_DIR, "chroma_db"))
RAG_EMBEDDING_MODEL = os.getenv("RAG_EMBEDDING_MODEL", "all-MiniLM-L6-v2")

# RAG 策略：无命中时的返回
RAG_NO_HIT_REPLY = "知识库中未检索到与问题相关的内容，您可以尝试提供更具体的关键词，或者联系管理员完善相关文档。"

