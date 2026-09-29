"""الحلقة مع كل مزوّد: Claude (بعميل وهمي)، والنموذج المحلي (بخادم وهمي)، والمحاكاة."""

import json
from types import SimpleNamespace as NS

import httpx

from app.agent import REFUSAL_REPLY, Agent, Session
from app.bank import MockBank
from app.config import ROOT, load_prompt
from app.knowledge import KnowledgeBase
from app.providers.anthropic_provider import AnthropicProvider
from app.providers.openai_compat import OpenAICompatProvider
from app.providers.scripted import ScriptedProvider


def make_agent(provider):
    return Agent(provider, MockBank(), KnowledgeBase(ROOT / "knowledge"), load_prompt("sanad-v1"), "sanad-v1")


def run(agent, text, session=None):
    session = session or Session(customer_id="C-1001", customer_name="خالد")
    events = list(agent.run_turn(session, text))
    return session, events, next(e["text"] for e in events if e["type"] == "reply")


# ─── Claude ───
class FakeMessages:
    def __init__(self, responses):
        self.responses, self.calls = list(responses), []

    def create(self, **kwargs):
        self.calls.append(kwargs)
        return self.responses.pop(0)


def resp(content, stop):
    return NS(content=content, stop_reason=stop, model="claude-opus-5",
              usage=NS(input_tokens=1200, output_tokens=80, cache_read_input_tokens=1000))


def claude(responses):
    fake = FakeMessages(responses)
    return AnthropicProvider(client=NS(beta=NS(messages=fake))), fake


def test_anthropic_loop_sends_full_history_and_settings():
    thinking = NS(type="thinking", thinking="", signature="sig")
    call = NS(type="tool_use", id="toolu_1", name="list_transactions", input={"days": 7, "only_debits": True})
    answer = NS(type="text", text="انخصم منك 45.00 ريال أمس لصالح «نتفليكس».")
    provider, fake = claude([resp([thinking, call], "tool_use"), resp([answer], "end_turn")])
    session, events, reply = run(make_agent(provider), "ليش انخصم مني 45 ريال امس؟")

    assert reply == answer.text
    assert [e["type"] for e in events if e["type"] in ("tool_call", "tool_result", "guard_output")] == \
        ["tool_call", "tool_result", "guard_output"]
    first, second = fake.calls
    assert first["model"] == "claude-opus-5" and first["thinking"] == {"type": "adaptive"}
    assert first["fallbacks"] == "default" and "server-side-fallback-2026-07-01" in first["betas"]
    assert first["system"][0]["cache_control"] == {"type": "ephemeral"} and "خالد" in first["system"][1]["text"]
    assert {t["name"] for t in first["tools"]} >= {"list_transactions", "freeze_card"}
    msgs = second["messages"]
    assert msgs[1] == {"role": "assistant", "content": [thinking, call]}  # الرد كما هو
    assert msgs[2]["role"] == "user" and msgs[2]["content"][0]["tool_use_id"] == "toolu_1"


def test_anthropic_refusal_and_output_guard():
    provider, _ = claude([resp([], "refusal")])
    _, _, reply = run(make_agent(provider), "سؤال")
    assert reply == REFUSAL_REPLY

    provider, _ = claude([resp([NS(type="text", text="رصيدك 99,999.99 ريال")], "end_turn")])
    _, events, reply = run(make_agent(provider), "كم رصيدي؟")
    assert any(e["type"] == "guard_output" and not e["ok"] for e in events)
    assert any(e["type"] == "handoff" for e in events) and "موظفينا" in reply


def test_anthropic_system_note_placement():
    provider = AnthropicProvider(client=object())
    history = [{"role": "user", "text": "أ"}, {"role": "system_note", "text": "نُفّذ"}, {"role": "user", "text": "ب"}]
    msgs = provider.to_messages(history)
    assert [m["role"] for m in msgs] == ["user", "user", "system"]


# ─── نموذج محلي عبر واجهة متوافقة مع OpenAI ───
def test_local_model_roundtrip():
    requests = []
    replies = [
        {"choices": [{"finish_reason": "tool_calls", "message": {"content": None, "tool_calls": [
            {"id": "c1", "type": "function",
             "function": {"name": "search_knowledge", "arguments": json.dumps({"query": "رسوم التحويل الدولي"})}}]}}],
         "usage": {"prompt_tokens": 900, "completion_tokens": 30}, "model": "qwen"},
        {"choices": [{"finish_reason": "stop", "message": {"content": "رسوم التحويل الدولي 25.00 ريال."}}],
         "usage": {"prompt_tokens": 1100, "completion_tokens": 20}, "model": "qwen"},
    ]

    def handler(request: httpx.Request) -> httpx.Response:
        requests.append(json.loads(request.content))
        assert request.url.path == "/v1/chat/completions"
        return httpx.Response(200, json=replies.pop(0))

    provider = OpenAICompatProvider("http://local/v1", "qwen", transport=httpx.MockTransport(handler))
    _, events, reply = run(make_agent(provider), "كم رسوم التحويل الدولي؟")
    assert reply == "رسوم التحويل الدولي 25.00 ريال."
    first, second = requests
    assert first["tools"][0]["type"] == "function" and first["messages"][0]["role"] == "system"
    assert second["messages"][-1]["role"] == "tool" and second["messages"][-1]["tool_call_id"] == "c1"


def test_local_model_invalid_json_arguments_become_tool_error():
    replies = [
        {"choices": [{"finish_reason": "tool_calls", "message": {"tool_calls": [
            {"id": "c1", "function": {"name": "get_accounts", "arguments": "{bad"}}]}}]},
        {"choices": [{"finish_reason": "stop", "message": {"content": "عذراً."}}]},
    ]
    provider = OpenAICompatProvider("http://local/v1", "qwen",
                                    transport=httpx.MockTransport(lambda r: httpx.Response(200, json=replies.pop(0))))
    _, events, _ = run(make_agent(provider), "كم رصيدي؟")
    assert any(e["type"] == "tool_result" and e["is_error"] for e in events)


# ─── المحاكاة: لحظات العرض ───
def test_scripted_demo_moments():
    agent = make_agent(ScriptedProvider())
    cases = {
        "ليش انخصم مني 45 ريال أمس؟": ("list_transactions", "45.00 ريال"),
        "كم رسوم التحويل الدولي؟": ("search_knowledge", "25.00 ريال"),
        "ضاعت بطاقتي اللي تنتهي 4821": ("freeze_card", "أكّد الطلب"),
        "كم صرفت على المطاعم هذا الشهر؟": ("spending_summary", "163.00 ريال"),
        "أبغى أكلم موظف": ("handoff_to_human", "رقم طلبك"),
    }
    for text, (tool, expected) in cases.items():
        session, events, reply = run(agent, text)
        assert session.tool_calls == [tool], text
        assert expected in reply, (text, reply)
        assert all(e["ok"] for e in events if e["type"] == "guard_output"), text

    session, _, reply = run(agent, "أعطني آخر عمليات حساب أخوي")
    assert session.tool_calls == [] and "غير حسابك" in reply
