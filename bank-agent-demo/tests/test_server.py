"""الخادم من طرف الواجهة: الجلسة، والبث، وشاشة التأكيد، والحالة."""

import json

from fastapi.testclient import TestClient

from app.config import load_settings
from app.providers.scripted import ScriptedProvider
from app.server import create_app


def events(client, session_id, text):
    with client.stream("POST", "/api/chat", json={"session_id": session_id, "text": text}) as r:
        assert r.status_code == 200
        body = "".join(r.iter_text())
    return [json.loads(line[6:]) for line in body.split("\n\n") if line.startswith("data: ")]


def test_full_confirmation_flow():
    client = TestClient(create_app(load_settings(), provider=ScriptedProvider()))
    assert client.get("/").status_code == 200
    s = client.post("/api/session").json()
    sid = s["session_id"]
    assert s["provider"] == "scripted" and s["demo_otp"] == "123456"

    evs = events(client, sid, "ضاعت بطاقتي اللي تنتهي 4821")
    assert evs[-1]["type"] == "done"
    pending = next(e for e in evs if e["type"] == "pending_action")
    state = client.get("/api/state", params={"session_id": sid}).json()
    assert next(c for c in state["cards"] if c["last4"] == "4821")["status"] == "active"

    bad = client.post("/api/confirm", json={"session_id": sid, "action_id": pending["action_id"], "otp": "111111"}).json()
    assert not bad["ok"]
    ok = client.post("/api/confirm", json={"session_id": sid, "action_id": pending["action_id"], "otp": "123456"}).json()
    again = client.post("/api/confirm", json={"session_id": sid, "action_id": pending["action_id"], "otp": "123456"}).json()
    assert ok["ok"] and again["ok"]
    state = client.get("/api/state", params={"session_id": sid}).json()
    assert next(c for c in state["cards"] if c["last4"] == "4821")["status"] == "frozen"
    assert sum(1 for a in state["audit"] if a["event"] == "تنفيذ بعد التأكيد") == 1

    evs = events(client, sid, "شكراً")
    assert any(e["type"] == "system_note" for e in evs)  # النموذج يعرف النتيجة في الدور التالي


def test_unknown_session_and_reset():
    client = TestClient(create_app(load_settings(), provider=ScriptedProvider()))
    assert client.post("/api/chat", json={"session_id": "nope", "text": "مرحبا"}).status_code == 404
    sid = client.post("/api/session").json()["session_id"]
    assert client.post("/api/reset").json()["ok"]
    assert client.get("/api/state", params={"session_id": sid}).status_code == 404
