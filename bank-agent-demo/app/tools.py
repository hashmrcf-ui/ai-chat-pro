"""أدوات الوكيل. لكل أداة وجهان: وصف يقرؤه النموذج (TOOLS)، ودالة ينفّذها النظام (HANDLERS).

قاعدة ثابتة: معرّف العميل لا يكون مُدخلاً في أي أداة. يأتي دائماً من الجلسة.
"""

from __future__ import annotations

import json
import time
from collections import defaultdict
from dataclasses import dataclass
from typing import TYPE_CHECKING, Callable

from .bank import BankError, MockBank, format_amount
from .knowledge import KnowledgeBase

if TYPE_CHECKING:
    from .agent import Session


class ToolError(Exception):
    """خطأ متوقع: نعيد نصه للنموذج ليتصرف بناءً عليه."""


def schema(properties: dict, required: list[str]) -> dict:
    return {"type": "object", "properties": properties, "required": required, "additionalProperties": False}


TOOLS: list[dict] = [
    {
        "name": "search_knowledge",
        "description": "يبحث في وثائق البنك الرسمية: الرسوم، وسياسة البطاقات، والاعتراض، وحدود التحويل. "
                       "استدعِها قبل الإجابة عن أي سؤال عن رسوم أو شروط أو إجراءات.",
        "strict": True,
        "input_schema": schema({"query": {"type": "string", "description": "سؤال البحث بصياغة واضحة"}}, ["query"]),
    },
    {
        "name": "get_accounts",
        "description": "يعرض حسابات العميل وأرصدتها. استدعِها عندما يسأل عن رصيده أو حساباته.",
        "strict": True,
        "input_schema": schema({}, []),
    },
    {
        "name": "list_transactions",
        "description": "يعرض آخر عمليات العميل. استدعِها عندما يسأل عن خصم أو عملية أو مبلغ في حسابه، "
                       "وقبل أن تذكر أي مبلغ من عملياته.",
        "strict": True,
        "input_schema": schema({
            "days": {"type": "integer", "description": "عدد الأيام للخلف، من 1 إلى 90"},
            "only_debits": {"type": "boolean", "description": "true لعرض الخصومات فقط"},
        }, ["days", "only_debits"]),
    },
    {
        "name": "spending_summary",
        "description": "يحسب مجموع مصروفات العميل حسب الفئة (مطاعم، بقالة، وقود…). استدعِها عندما يسأل "
                       "كم صرف أو عن مجموع مصاريفه. لا تجمع المبالغ بنفسك.",
        "strict": True,
        "input_schema": schema({"days": {"type": "integer", "description": "عدد الأيام للخلف، من 1 إلى 90"}}, ["days"]),
    },
    {
        "name": "freeze_card",
        "description": "يطلب إيقاف بطاقة مؤقتاً. لا يوقفها فوراً: يُظهر للعميل شاشة تأكيد في التطبيق. "
                       "استدعِها عندما يطلب العميل إيقاف بطاقة أو يبلّغ عن فقدانها أو سرقتها.",
        "strict": True,
        "input_schema": schema({
            "card_last4": {"type": "string", "description": "آخر أربعة أرقام من البطاقة"},
            "reason": {"type": "string", "enum": ["lost", "stolen", "suspicious", "temporary"]},
        }, ["card_last4", "reason"]),
    },
    {
        "name": "handoff_to_human",
        "description": "يحوّل المحادثة لموظف مع ملخص. استدعِها عند طلب العميل، أو الاشتباه في احتيال، "
                       "أو الشكوى الرسمية، أو إذا كان الطلب خارج نطاقك.",
        "strict": True,
        "input_schema": schema({
            "reason": {"type": "string", "enum": ["customer_request", "fraud_suspected", "complaint", "out_of_scope"]},
            "summary": {"type": "string", "description": "ملخص الطلب في سطرين للموظف"},
        }, ["reason", "summary"]),
    },
]
SCHEMAS = {t["name"]: t["input_schema"] for t in TOOLS}
TYPES = {"string": str, "integer": int, "boolean": bool}


def validate(name: str, args: dict) -> None:
    """الوضع الصارم يضمن الشكل مع Claude. النماذج المحلية قد لا تضمنه، فنتحقق هنا دائماً."""
    if "__invalid_json__" in args:
        raise ToolError("المدخلات ليست JSON صالحاً. أعد الاستدعاء بمدخلات صحيحة.")
    spec = SCHEMAS[name]
    extra = set(args) - set(spec["properties"])
    missing = set(spec["required"]) - set(args)
    if extra or missing:
        raise ToolError(f"مدخلات غير صحيحة للأداة {name}: ناقص {sorted(missing)}، زائد {sorted(extra)}.")
    for key, prop in spec["properties"].items():
        value = args[key]
        want = TYPES[prop["type"]]
        if not isinstance(value, want) or (want is int and isinstance(value, bool)):
            raise ToolError(f"المدخل {key} يجب أن يكون من نوع {prop['type']}.")
        if "enum" in prop and value not in prop["enum"]:
            raise ToolError(f"القيمة {value} غير مسموحة للمدخل {key}.")


# ─── التنفيذ: ما لا يراه النموذج ───

def _days(value: int) -> int:
    return max(1, min(int(value), 90))  # لا نثق بالمدخلات حتى لو طابقت المخطط


def search_knowledge(ctx: "ToolContext", query: str) -> list[dict]:
    hits = ctx.knowledge.search(query, top_k=3)
    if not hits:
        raise ToolError("لا توجد وثيقة تجيب عن هذا السؤال. قل ذلك للعميل واعرض التحويل لموظف.")
    return [{"source": f"{h.source} · {h.section}", "updated": h.updated, "text": h.text} for h in hits]


def get_accounts(ctx: "ToolContext") -> list[dict]:
    return [{"account": a.name, "number": f"••••{a.number_last4}", "balance": format_amount(a.balance_minor)}
            for a in ctx.bank.list_accounts(ctx.session.customer_id)]


def list_transactions(ctx: "ToolContext", days: int, only_debits: bool) -> list[dict]:
    rows = ctx.bank.list_transactions(ctx.session.customer_id, _days(days))
    if only_debits:
        rows = [t for t in rows if t.amount_minor < 0]
    return [{"date": t.day.isoformat(), "merchant": t.merchant, "category": t.category,
             "type": "خصم" if t.amount_minor < 0 else "إيداع", "amount": format_amount(t.amount_minor), "id": t.id}
            for t in rows[:20]]


def spending_summary(ctx: "ToolContext", days: int) -> dict:
    days = _days(days)
    totals: dict[str, int] = defaultdict(int)
    for t in ctx.bank.list_transactions(ctx.session.customer_id, days):
        if t.amount_minor < 0 and t.category not in ("تحويلات", "سحب نقدي"):
            totals[t.category] += -t.amount_minor
    ranked = sorted(totals.items(), key=lambda kv: kv[1], reverse=True)
    return {"days": days, "total": format_amount(sum(totals.values())),
            "by_category": [{"category": c, "amount": format_amount(v)} for c, v in ranked],
            "note": "المجموع يستثني التحويلات والسحب النقدي"}


def freeze_card(ctx: "ToolContext", card_last4: str, reason: str) -> dict:
    cards = [c for c in ctx.bank.list_cards(ctx.session.customer_id) if c.last4 == card_last4.strip()]
    if not cards:
        raise ToolError("لا توجد بطاقة بهذه الأرقام لدى العميل. اسأله عن آخر أربعة أرقام من بطاقته.")
    card = cards[0]
    if card.status == "frozen":
        raise ToolError(f"البطاقة المنتهية بـ {card.last4} موقوفة مسبقاً. أخبر العميل بذلك.")
    reasons = {"lost": "فقدان", "stolen": "سرقة", "suspicious": "عملية مشبوهة", "temporary": "إيقاف مؤقت"}
    summary = f"إيقاف {card.kind} المنتهية بـ {card.last4} مؤقتاً"
    action = ctx.bank.create_pending(ctx.session.id, ctx.session.customer_id, "freeze_card",
                                     {"card_id": card.id, "reason": reason}, f"{summary} (السبب: {reasons[reason]})")
    ctx.event = {"type": "pending_action", "action_id": action.id, "summary": summary,
                 "card_kind": card.kind, "card_last4": card.last4, "reason": reasons[reason]}
    return {"status": "awaiting_customer_confirmation", "action_id": action.id,
            "note": "لم تُوقف البطاقة بعد. تُوقف بعد تأكيد العميل من شاشة التطبيق."}


def handoff_to_human(ctx: "ToolContext", reason: str, summary: str) -> dict:
    ticket = ctx.bank.create_ticket(ctx.session.id, ctx.session.customer_id, reason, summary)
    ctx.event = {"type": "handoff", "ticket": ticket.id, "reason": reason, "summary": summary,
                 "wait_minutes": ticket.eta_minutes}
    return {"status": "queued", "ticket": ticket.id, "wait_minutes": ticket.eta_minutes}


HANDLERS: dict[str, Callable] = {
    "search_knowledge": search_knowledge,
    "get_accounts": get_accounts,
    "list_transactions": list_transactions,
    "spending_summary": spending_summary,
    "freeze_card": freeze_card,
    "handoff_to_human": handoff_to_human,
}


@dataclass
class ToolContext:
    session: "Session"
    bank: MockBank
    knowledge: KnowledgeBase
    event: dict | None = None


@dataclass
class ToolOutcome:
    output: str
    is_error: bool
    ms: int
    event: dict | None


def run_tool(ctx: ToolContext, name: str, args: dict) -> ToolOutcome:
    started = time.monotonic()
    try:
        if name not in HANDLERS:
            raise ToolError(f"أداة غير معروفة: {name}")
        validate(name, args)
        output, is_error = json.dumps(HANDLERS[name](ctx, **args), ensure_ascii=False), False
    except (ToolError, BankError) as e:
        output, is_error = str(e), True
    except Exception:  # خطأ غير متوقع: لا نكشف تفاصيله للنموذج
        output, is_error = "تعذّر الوصول للنظام الآن. اعتذر للعميل واعرض التحويل لموظف.", True
    ms = int((time.monotonic() - started) * 1000)
    return ToolOutcome(output, is_error, ms, ctx.event)
