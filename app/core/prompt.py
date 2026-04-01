import os

# 获取当前文件所在目录的父目录（app/），再进入 prompts/
PROMPTS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "prompts")

def load_prompt(name: str) -> str:
    """
    从 app/prompts 目录加载指定的 .txt 文件内容。
    如果文件不存在，返回默认的系统提示词。
    """
    file_path = os.path.join(PROMPTS_DIR, f"{name}.txt")
    
    # 如果文件不存在，回退到默认
    if not os.path.exists(file_path):
        return os.getenv("SYSTEM_PROMPT", "你是一个专业、耐心、简洁的中文助手。")
        
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read().strip()
            return content if content else os.getenv("SYSTEM_PROMPT", "你是一个专业、耐心、简洁的中文助手。")
    except Exception:
        return os.getenv("SYSTEM_PROMPT", "你是一个专业、耐心、简洁的中文助手。")

def build_system_message(template_name: str = "chat_system") -> dict:
    """
    构造系统消息对象
    """
    content = load_prompt(template_name)
    return {"role": "system", "content": content}
