"""نموذج مفتوح يعمل داخل البنك عبر واجهة متوافقة مع OpenAI (مثل Ollama أو vLLM).

هذا مسار الدول التي لا تخدمها واجهات النماذج التجارية، أو البنوك التي تشترط ألا تغادر البيانات خوادمها.
"""

from __future__ import annotations

import json
from typing import Any

import httpx

from .base import ModelTurn, ToolCall


class OpenAICompatProvider:
    name = "local"

    def __init__(self, base_url: str, model: str, api_key: str = "", transport: Any = None, timeout: float = 180):
        headers = {"Authorization": f"Bearer {api_key}"} if api_key else {}
        self.http = httpx.Client(base_url=base_url, headers=headers, timeout=timeout, transport=transport)
        self.model = model
        self.label = f"نموذج محلي · {model}"

    def to_messages(self, system_prompt: str, session_block: str, history: list[dict]) -> list[dict]:
        msgs: list[dict] = [{"role": "system", "content": f"{system_prompt}\n\n{session_block}"}]
        for ev in history:
            role = ev["role"]
            if role == "user":
                msgs.append({"role": "user", "content": ev["text"]})
            elif role == "system_note":
                msgs.append({"role": "system", "content": ev["text"]})
            elif role == "assistant":
                msg: dict = {"role": "assistant", "content": ev["text"] or None}
                if ev["tool_calls"]:
                    msg["tool_calls"] = [
                        {"id": c["id"], "type": "function",
                         "function": {"name": c["name"], "arguments": json.dumps(c["input"], ensure_ascii=False)}}
                        for c in ev["tool_calls"]]
                msgs.append(msg)
            elif role == "tool":
                msgs.append({"role": "tool", "tool_call_id": ev["id"], "content": ev["output"]})
        return msgs

    def step(self, system_prompt: str, session_block: str, history: list[dict], tools: list[dict]) -> ModelTurn:
        body = {
            "model": self.model,
            "messages": self.to_messages(system_prompt, session_block, history),
            "tools": [{"type": "function", "function": {"name": t["name"], "description": t["description"],
                                                        "parameters": t["input_schema"]}} for t in tools],
            "tool_choice": "auto",
        }
        r = self.http.post("chat/completions", json=body)
        r.raise_for_status()
        data = r.json()
        choice = data["choices"][0]
        message = choice.get("message") or {}
        calls = []
        for i, tc in enumerate(message.get("tool_calls") or []):
            fn = tc.get("function") or {}
            try:
                args = json.loads(fn.get("arguments") or "{}")
                if not isinstance(args, dict):
                    raise ValueError
            except ValueError:
                args = {"__invalid_json__": fn.get("arguments")}  # الأداة ترفضه وتطلب إعادة المحاولة
            calls.append(ToolCall(tc.get("id") or f"call_{i}", fn.get("name", ""), args))
        stop = "tool_use" if calls else ("max_tokens" if choice.get("finish_reason") == "length" else "end")
        usage = data.get("usage") or {}
        return ModelTurn(
            text=message.get("content") or "",
            tool_calls=calls,
            stop=stop,
            model=data.get("model", self.model),
            usage={"input_tokens": usage.get("prompt_tokens", 0), "output_tokens": usage.get("completion_tokens", 0),
                   "cached_tokens": 0},
        )
