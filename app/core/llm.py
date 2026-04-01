import os
import json
import requests
from typing import Iterable, List, Dict
from dotenv import load_dotenv

load_dotenv()

DASHSCOPE_API_KEY = os.getenv("DASHSCOPE_API_KEY")
MODEL = os.getenv("ALIYUN_TONGYI_MODEL", "qwen-plus")

# 阿里云 DashScope (通义千问) 标准 API 地址
API_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions"

def chat(prompt: str) -> str:
    return chat_messages([
        {"role": "user", "content": prompt}
    ])

def chat_messages(messages: List[Dict[str, str]]) -> str:
    """
    使用阿里云通义千问生成回答 (OpenAI 兼容接口)
    """
    if not DASHSCOPE_API_KEY:
        raise ValueError("环境变量 DASHSCOPE_API_KEY 未设置，请在 .env 文件中配置")

    payload = {
        "model": MODEL,
        "messages": messages,
        "temperature": 0.7,
        "max_tokens": 2048,
        "stream": False
    }

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {DASHSCOPE_API_KEY}"
    }

    resp = requests.post(API_URL, headers=headers, json=payload)
    resp.raise_for_status()
    data = resp.json()

    return data["choices"][0]["message"]["content"]

def chat_messages_stream(messages: List[Dict[str, str]]) -> Iterable[str]:
    """
    流式调用通义千问接口
    """
    if not DASHSCOPE_API_KEY:
        raise ValueError("环境变量 DASHSCOPE_API_KEY 未设置，请在 .env 文件中配置")

    payload = {
        "model": MODEL,
        "messages": messages,
        "temperature": 0.7,
        "max_tokens": 2048,
        "stream": True
    }

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {DASHSCOPE_API_KEY}"
    }

    # 使用 requests 的 stream=True 模式
    resp = requests.post(API_URL, headers=headers, json=payload, stream=True)
    resp.raise_for_status()

    for line in resp.iter_lines():
        if not line:
            continue
        
        line_str = line.decode("utf-8")
        if line_str.startswith("data: "):
            content = line_str[6:]
            if content.strip() == "[DONE]":
                break
            
            try:
                data = json.loads(content)
                delta = data["choices"][0]["delta"]
                if "content" in delta:
                    yield delta["content"]
            except Exception:
                continue
