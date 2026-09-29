"""مُقيِّم الوكيل: يشغّل كل حالة في جلسة جديدة على بنك وهمي جديد، ويتحقق من السلوك.

التشغيل:  python -m evals.run            (بالنموذج المحدد في LLM_PROVIDER)
الخروج برمز 1 إذا فشلت أي حالة، ليُستخدم قبل أي تعديل على التعليمات أو النموذج.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

from app.agent import Agent, Session
from app.bank import MockBank
from app.config import ROOT, load_prompt, load_settings
from app.knowledge import KnowledgeBase
from app.providers import make_provider


def check(case: dict, session: Session, reply: str, events: list[dict]) -> list[str]:
    called = set(session.tool_calls)
    problems = []
    for tool in case.get("must_call", []):
        if tool not in called:
            problems.append(f"لم يستدعِ {tool}")
    for tool in case.get("must_not_call", []):
        if tool in called:
            problems.append(f"استدعى {tool} وكان يجب ألا يفعل")
    for text in case.get("must_contain", []):
        if text not in reply:
            problems.append(f"الرد لا يحتوي «{text}»")
    if case.get("must_contain_any") and not any(t in reply for t in case["must_contain_any"]):
        problems.append("الرد لا يحتوي أياً من العبارات المتوقعة")
    for text in case.get("must_not_contain", []):
        if text in reply:
            problems.append(f"الرد يحتوي «{text}»")
    if case.get("must_pending") and not any(e["type"] == "pending_action" for e in events):
        problems.append("لم يُنشئ إجراءً معلّقاً للتأكيد")
    return problems


def main() -> int:
    settings = load_settings()
    provider = make_provider(settings)
    if getattr(provider, "delay", 0):
        provider.delay = 0  # لا حاجة لإبطاء المحاكاة أثناء التقييم
    knowledge = KnowledgeBase(ROOT / "knowledge")
    prompt = load_prompt(settings.prompt_version)
    cases = json.loads((Path(__file__).parent / "cases.json").read_text(encoding="utf-8"))
    print(f"النموذج: {provider.label} · التعليمات: {settings.prompt_version} · {len(cases)} حالة\n")

    failed = 0
    for case in cases:
        bank = MockBank()
        agent = Agent(provider, bank, knowledge, prompt, settings.prompt_version)
        session = Session(customer_id="C-1001", customer_name="خالد")
        events = list(agent.run_turn(session, case["text"]))
        reply = next((e["text"] for e in reversed(events) if e["type"] == "reply"), "")
        problems = check(case, session, reply, events)
        mark = "✓" if not problems else "✗"
        failed += bool(problems)
        print(f"{mark} {case['id']:<8} {case['category']:<12} {case['text']}")
        for p in problems:
            print(f"      ← {p}")
            print(f"      الرد: {reply[:160]}")

    print(f"\nنجح {len(cases) - failed} من {len(cases)}")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
