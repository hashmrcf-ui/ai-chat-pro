"""Claude عبر مكتبة Anthropic الرسمية."""

from __future__ import annotations

from typing import Any

import anthropic

from .base import ModelTurn, ToolCall

STOP = {"end_turn": "end", "stop_sequence": "end", "tool_use": "tool_use",
        "max_tokens": "max_tokens", "refusal": "refusal"}


class AnthropicProvider:
    name = "anthropic"

    def __init__(self, model: str = "claude-opus-5", effort: str = "medium", client: Any = None):
        self.model = model
        self.effort = effort
        self.client = client or anthropic.Anthropic()
        self.label = f"Claude · {model}"

    def to_messages(self, history: list[dict]) -> list[dict]:
        msgs: list[dict] = []
        for ev in history:
            role = ev["role"]
            if role == "user":
                msgs.append({"role": "user", "content": ev["text"]})
            elif role == "system_note":
                msgs.append({"role": "system", "content": ev["text"]})
            elif role == "assistant":
                if ev.get("provider") == self.name and ev.get("raw") is not None:
                    content = ev["raw"]  # الرد كما هو، مع كتل التفكير وطلبات الأدوات
                else:
                    content = ([{"type": "text", "text": ev["text"]}] if ev["text"] else []) + [
                        {"type": "tool_use", "id": c["id"], "name": c["name"], "input": c["input"]}
                        for c in ev["tool_calls"]]
                if content:
                    msgs.append({"role": "assistant", "content": content})
            elif role == "tool":
                block = {"type": "tool_result", "tool_use_id": ev["id"], "content": ev["output"]}
                if ev["is_error"]:
                    block["is_error"] = True
                last = msgs[-1] if msgs else None
                if last and last.get("_tool_results"):
                    last["content"].append(block)  # كل نتائج الدور في رسالة واحدة
                else:
                    msgs.append({"role": "user", "content": [block], "_tool_results": True})
        # رسالة النظام يجب أن تتبع رسالة عميل، وأن تكون الأخيرة أو يتبعها رد النموذج
        for i in range(len(msgs) - 1):
            if msgs[i]["role"] == "system" and msgs[i + 1]["role"] == "user":
                msgs[i], msgs[i + 1] = msgs[i + 1], msgs[i]
        for m in msgs:
            m.pop("_tool_results", None)
        return msgs

    def step(self, system_prompt: str, session_block: str, history: list[dict], tools: list[dict]) -> ModelTurn:
        response = self.client.beta.messages.create(
            model=self.model,
            max_tokens=16000,
            system=[
                {"type": "text", "text": system_prompt, "cache_control": {"type": "ephemeral"}},
                {"type": "text", "text": session_block},
            ],
            tools=tools,
            messages=self.to_messages(history),
            thinking={"type": "adaptive"},
            output_config={"effort": self.effort},
            betas=["server-side-fallback-2026-07-01"],
            fallbacks="default",  # نموذج بديل إذا رُفض طلب بريء لأسباب أمنية
        )
        content = list(response.content)
        usage = response.usage
        return ModelTurn(
            text="".join(b.text for b in content if b.type == "text"),
            tool_calls=[ToolCall(b.id, b.name, dict(b.input)) for b in content if b.type == "tool_use"],
            stop=STOP.get(response.stop_reason or "", "end"),
            raw=content,
            model=response.model,
            usage={
                "input_tokens": usage.input_tokens,
                "output_tokens": usage.output_tokens,
                "cached_tokens": getattr(usage, "cache_read_input_tokens", 0) or 0,
            },
        )
