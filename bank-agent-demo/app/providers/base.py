"""واجهة موحّدة لأي نموذج. الوكيل لا يعرف أي نموذج يعمل خلفه.

سجل المحادثة محفوظ بصيغة محايدة، وكل مزوّد يحوّله لصيغته:
  {"role": "user", "text": ...}
  {"role": "assistant", "text": ..., "tool_calls": [{"id", "name", "input"}], "raw": ..., "provider": ...}
  {"role": "tool", "id": ..., "name": ..., "output": ..., "is_error": bool}
  {"role": "system_note", "text": ...}   ← ملاحظة تشغيلية من النظام، مثل نتيجة تأكيد العميل
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Protocol


@dataclass
class ToolCall:
    id: str
    name: str
    input: dict


@dataclass
class ModelTurn:
    text: str
    tool_calls: list[ToolCall]
    stop: str  # "end" | "tool_use" | "max_tokens" | "refusal"
    raw: Any = None
    model: str = ""
    usage: dict = field(default_factory=dict)


class Provider(Protocol):
    name: str
    label: str

    def step(self, system_prompt: str, session_block: str, history: list[dict], tools: list[dict]) -> ModelTurn: ...
