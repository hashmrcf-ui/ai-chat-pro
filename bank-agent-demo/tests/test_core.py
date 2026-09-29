"""الحواجز، والبنك الوهمي، والأدوات، والبحث العربي."""

from app.bank import BankError, MockBank
from app.guards import guard_input, guard_output, normalize_ar
from app.knowledge import KnowledgeBase
from app.config import ROOT
from app.tools import ToolContext, run_tool
from app.agent import Session

import pytest


def test_guard_input_masks_long_numbers_and_arabic_digits():
    assert guard_input("رقم بطاقتي ٤٥٨٧١٢٣٤٥٦٧٨٤٨٢١") == "رقم بطاقتي ••••4821"
    assert guard_input("تنتهي 4821") == "تنتهي 4821"


def test_guard_output_blocks_amounts_not_from_tools():
    outputs = ['[{"amount": "45.00 ريال"}]']
    assert guard_output("انخصم منك 45.00 ريال", outputs).ok
    bad = guard_output("مجموع مصاريفك 1,234.50 ريال", outputs)
    assert not bad.ok and "1,234.50" in bad.detail


def test_normalize_ar_unifies_spelling():
    assert normalize_ar("الإيجار") == normalize_ar("الايجار")
    assert normalize_ar("مَدْرَسَة") == "مدرسه"


def test_knowledge_search_finds_the_right_section():
    kb = KnowledgeBase(ROOT / "knowledge")
    top = kb.search("كم رسوم التحويل الدولي؟")[0]
    assert top.source == "جدول رسوم الخدمات" and top.section == "التحويلات"
    top = kb.search("كم يوم عندي عشان أعترض على عملية؟")[0]
    assert top.section == "متى يمكن الاعتراض"


def ctx(bank: MockBank, customer="C-1001") -> ToolContext:
    return ToolContext(Session(customer_id=customer, customer_name="خالد"), bank, KnowledgeBase(ROOT / "knowledge"))


def test_tools_only_see_the_session_customer():
    bank = MockBank()
    out = run_tool(ctx(bank), "list_transactions", {"days": 90, "only_debits": True})
    assert not out.is_error
    assert "T-900" not in out.output  # عملية العميل الآخر لا تظهر أبداً
    out = run_tool(ctx(bank), "freeze_card", {"card_last4": "1188", "reason": "lost"})
    assert out.is_error  # بطاقة عميل آخر


def test_tool_validation_rejects_bad_inputs_from_any_model():
    bank = MockBank()
    assert run_tool(ctx(bank), "list_transactions", {"days": "7", "only_debits": True}).is_error
    assert run_tool(ctx(bank), "list_transactions", {"days": 7}).is_error
    assert run_tool(ctx(bank), "freeze_card", {"card_last4": "4821", "reason": "bored"}).is_error
    assert run_tool(ctx(bank), "get_accounts", {"customer_id": "C-2002"}).is_error
    assert run_tool(ctx(bank), "nope", {}).is_error


def test_freeze_needs_confirmation_and_executes_once():
    bank = MockBank()
    c = ctx(bank)
    out = run_tool(c, "freeze_card", {"card_last4": "4821", "reason": "lost"})
    assert not out.is_error and out.event["type"] == "pending_action"
    card = next(k for k in bank.cards if k.last4 == "4821")
    assert card.status == "active"  # لا شيء قبل التأكيد

    action_id = out.event["action_id"]
    with pytest.raises(BankError):
        bank.confirm(c.session.id, action_id, "000000")
    with pytest.raises(BankError):
        bank.confirm("another-session", action_id, "123456")
    first = bank.confirm(c.session.id, action_id, "123456")
    second = bank.confirm(c.session.id, action_id, "123456")
    assert first == second and card.status == "frozen"
    assert sum(1 for a in bank.audit if a["event"] == "تنفيذ بعد التأكيد") == 1


def test_spending_summary_is_computed_by_code():
    bank = MockBank()
    out = run_tool(ctx(bank), "spending_summary", {"days": 30})
    assert '"مطاعم"' in out.output and "163.00 ريال" in out.output  # 86.00 + 23.00 + 54.00
