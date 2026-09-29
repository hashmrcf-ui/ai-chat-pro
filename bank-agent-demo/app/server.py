"""خادم العرض: واجهة المحادثة، ولوحة «خلف الكواليس»، ونقطة التأكيد التي يستدعيها التطبيق لا النموذج."""

from __future__ import annotations

import json
from typing import Iterator

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from .agent import Agent, Session
from .bank import DEMO_OTP, BankError, MockBank
from .config import ROOT, Settings, load_prompt, load_settings
from .knowledge import KnowledgeBase
from .providers import Provider, make_provider

DEMO_CUSTOMER = "C-1001"


class ChatIn(BaseModel):
    session_id: str
    text: str


class ActionIn(BaseModel):
    session_id: str
    action_id: str
    otp: str = ""


def create_app(settings: Settings | None = None, provider: Provider | None = None) -> FastAPI:
    settings = settings or load_settings()
    bank = MockBank()
    agent = Agent(
        provider=provider or make_provider(settings),
        bank=bank,
        knowledge=KnowledgeBase(ROOT / "knowledge"),
        system_prompt=load_prompt(settings.prompt_version),
        prompt_version=settings.prompt_version,
    )
    sessions: dict[str, Session] = {}
    app = FastAPI(title="Bank agent demo")
    app.state.agent, app.state.bank, app.state.sessions = agent, bank, sessions

    def get_session(session_id: str) -> Session:
        if session_id not in sessions:
            raise HTTPException(404, "الجلسة غير موجودة. أعد تحميل الصفحة.")
        return sessions[session_id]

    @app.get("/")
    def index() -> FileResponse:
        return FileResponse(ROOT / "static" / "index.html")

    @app.post("/api/session")
    def new_session() -> dict:
        customer = bank.customer(DEMO_CUSTOMER)
        session = Session(customer_id=customer.id, customer_name=customer.name)
        sessions[session.id] = session
        return {"session_id": session.id, "customer_name": customer.name, "provider": agent.provider.name,
                "provider_label": agent.provider.label, "prompt_version": agent.prompt_version, "demo_otp": DEMO_OTP}

    @app.post("/api/chat")
    def chat(body: ChatIn) -> StreamingResponse:
        session = get_session(body.session_id)
        text = body.text.strip()[:1000]
        if not text:
            raise HTTPException(400, "الرسالة فارغة.")

        def events() -> Iterator[str]:
            for event in agent.run_turn(session, text):
                yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"
            yield "data: {\"type\": \"done\"}\n\n"

        return StreamingResponse(events(), media_type="text/event-stream",
                                 headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})

    @app.post("/api/confirm")
    def confirm(body: ActionIn) -> dict:
        session = get_session(body.session_id)
        try:
            result = bank.confirm(session.id, body.action_id, body.otp)
        except BankError as e:
            return {"ok": False, "message": str(e)}
        note = f"نُفّذ إيقاف البطاقة المنتهية بـ {result['card_last4']} بعد تأكيد العميل برمز التحقق."
        if note not in session.pending_notes:
            session.pending_notes.append(note)  # يعرفه النموذج مع رسالة العميل التالية
        return {"ok": True, "message": f"تم إيقاف البطاقة المنتهية بـ {result['card_last4']} مؤقتاً.", "result": result}

    @app.post("/api/cancel")
    def cancel(body: ActionIn) -> dict:
        session = get_session(body.session_id)
        bank.cancel(session.id, body.action_id)
        session.pending_notes.append("ألغى العميل طلب إيقاف البطاقة من شاشة التأكيد. البطاقة ما زالت فعّالة.")
        return {"ok": True, "message": "أُلغي الطلب، والبطاقة ما زالت فعّالة."}

    @app.get("/api/state")
    def state(session_id: str) -> dict:
        session = get_session(session_id)
        return {
            "cards": [{"kind": c.kind, "last4": c.last4, "status": c.status}
                      for c in bank.list_cards(session.customer_id)],
            "tickets": [{"id": t.id, "reason": t.reason, "summary": t.summary, "wait_minutes": t.eta_minutes}
                        for t in bank.tickets if t.customer_id == session.customer_id],
            "audit": bank.audit[-30:],
        }

    @app.post("/api/reset")
    def reset() -> dict:
        bank.reset()
        sessions.clear()
        return {"ok": True}

    app.mount("/static", StaticFiles(directory=ROOT / "static"), name="static")
    return app


app = create_app()
