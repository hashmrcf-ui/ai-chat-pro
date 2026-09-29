"""حلقة الوكيل: أرسل، اقرأ القرار، نفّذ الأدوات، أعد النتائج، كرّر حتى الرد النهائي.

run_turn مولّد أحداث: كل خطوة تُرسل للواجهة لحظة حدوثها لتظهر في لوحة «خلف الكواليس».
"""

from __future__ import annotations

import time
import uuid
from dataclasses import asdict, dataclass, field
from datetime import date
from typing import Iterator

from .bank import MockBank
from .guards import guard_input, guard_output, normalize_digits
from .knowledge import KnowledgeBase
from .providers.base import Provider
from .tools import TOOLS, ToolContext, run_tool

MAX_STEPS = 8
REFUSAL_REPLY = "عذراً، لا أستطيع المساعدة في هذا الطلب هنا. هل تريد التحدث مع موظف؟"
ERROR_REPLY = "عذراً، واجهت مشكلة تقنية الآن. هل تريد التحدث مع موظف؟"


@dataclass
class Session:
    customer_id: str  # من نظام الدخول، لا من المحادثة
    customer_name: str
    id: str = field(default_factory=lambda: uuid.uuid4().hex[:12])
    history: list[dict] = field(default_factory=list)
    tool_calls: list[str] = field(default_factory=list)
    tool_outputs: list[str] = field(default_factory=list)
    pending_notes: list[str] = field(default_factory=list)


class Agent:
    def __init__(self, provider: Provider, bank: MockBank, knowledge: KnowledgeBase, system_prompt: str,
                 prompt_version: str):
        self.provider = provider
        self.bank = bank
        self.knowledge = knowledge
        self.system_prompt = system_prompt
        self.prompt_version = prompt_version

    def session_block(self, session: Session) -> str:
        return f"<session>\nاسم العميل: {session.customer_name}\nتاريخ اليوم: {date.today().isoformat()}\n</session>"

    def _handoff(self, session: Session, summary: str) -> tuple[str, dict]:
        ticket = self.bank.create_ticket(session.id, session.customer_id, "agent_failure", summary)
        event = {"type": "handoff", "ticket": ticket.id, "reason": "agent_failure", "summary": summary,
                 "wait_minutes": ticket.eta_minutes}
        return f"سأحوّلك لأحد موظفينا ليكمل معك. رقم طلبك {ticket.id}.", event

    def run_turn(self, session: Session, text: str) -> Iterator[dict]:
        started = time.monotonic()
        clean = guard_input(text)
        yield {"type": "guard_input", "masked": clean != normalize_digits(text.strip()), "text": clean}
        session.history.append({"role": "user", "text": clean})
        for note in session.pending_notes:
            session.history.append({"role": "system_note", "text": note})
            yield {"type": "system_note", "text": note}
        session.pending_notes.clear()

        for step in range(1, MAX_STEPS + 1):
            yield {"type": "model_call", "step": step, "provider": self.provider.label}
            try:
                turn = self.provider.step(self.system_prompt, self.session_block(session), session.history, TOOLS)
            except Exception as e:  # انقطاع الشبكة أو خطأ من المزوّد
                yield {"type": "error", "message": f"{type(e).__name__}: {e}"[:300]}
                yield {"type": "reply", "text": ERROR_REPLY, "ms": self._ms(started)}
                return
            yield {"type": "model_result", "step": step, "stop": turn.stop, "model": turn.model,
                   "tools": [c.name for c in turn.tool_calls], "usage": turn.usage}

            if turn.stop == "refusal":
                yield {"type": "reply", "text": REFUSAL_REPLY, "ms": self._ms(started)}
                return
            if turn.stop == "max_tokens":  # رد مقطوع: لا ننفّذ أداة ناقصة
                reply, event = self._handoff(session, "انقطع رد المساعد قبل اكتماله.")
                yield event
                yield {"type": "reply", "text": reply, "ms": self._ms(started)}
                return

            session.history.append({"role": "assistant", "text": turn.text,
                                    "tool_calls": [asdict(c) for c in turn.tool_calls],
                                    "raw": turn.raw, "provider": self.provider.name})

            if turn.stop != "tool_use" or not turn.tool_calls:
                check = guard_output(turn.text, session.tool_outputs)
                yield {"type": "guard_output", "ok": check.ok, "detail": check.detail}
                if check.ok:
                    reply = check.text or "كيف أقدر أساعدك؟"
                else:
                    reply, event = self._handoff(session, f"أوقف حاجز الإخراج رداً: {check.detail}.")
                    yield event
                yield {"type": "reply", "text": reply, "ms": self._ms(started)}
                return

            for call in turn.tool_calls:
                yield {"type": "tool_call", "id": call.id, "name": call.name, "input": call.input}
                session.tool_calls.append(call.name)
                outcome = run_tool(ToolContext(session, self.bank, self.knowledge), call.name, call.input)
                session.tool_outputs.append(outcome.output)
                session.history.append({"role": "tool", "id": call.id, "name": call.name,
                                        "output": outcome.output, "is_error": outcome.is_error})
                yield {"type": "tool_result", "name": call.name, "output": outcome.output,
                       "is_error": outcome.is_error, "ms": outcome.ms}
                if outcome.event:
                    yield outcome.event

        reply, event = self._handoff(session, "تجاوز المساعد الحد الأقصى للخطوات.")
        yield event
        yield {"type": "reply", "text": reply, "ms": self._ms(started)}

    @staticmethod
    def _ms(started: float) -> int:
        return int((time.monotonic() - started) * 1000)
