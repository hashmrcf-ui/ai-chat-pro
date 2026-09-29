"""بنك وهمي للعرض. لا يتصل بأي نظام حقيقي.

كل المبالغ أعداد صحيحة بالهللة (100 هللة = 1 ريال). الخصم سالب والإيداع موجب.
"""

from __future__ import annotations

import threading
import time
import uuid
from dataclasses import dataclass, field
from datetime import date, timedelta

DEMO_OTP = "123456"
ACTION_TTL_SECONDS = 600


class BankError(Exception):
    """خطأ متوقع من البنك، نصه مناسب لعرضه."""


@dataclass
class Account:
    id: str
    customer_id: str
    name: str
    number_last4: str
    balance_minor: int


@dataclass
class Card:
    id: str
    customer_id: str
    kind: str
    last4: str
    status: str = "active"


@dataclass
class Transaction:
    id: str
    customer_id: str
    day: date
    merchant: str
    category: str
    amount_minor: int


@dataclass
class PendingAction:
    id: str
    session_id: str
    customer_id: str
    kind: str
    params: dict
    summary: str
    idempotency_key: str
    created_at: float
    status: str = "pending"
    result: dict | None = None

    def is_expired(self) -> bool:
        return time.time() - self.created_at > ACTION_TTL_SECONDS


@dataclass
class Ticket:
    id: str
    session_id: str
    customer_id: str
    reason: str
    summary: str
    eta_minutes: int
    created_at: float


@dataclass
class Customer:
    id: str
    name: str


def format_amount(amount_minor: int) -> str:
    whole, minor = divmod(abs(amount_minor), 100)
    return f"{whole:,}.{minor:02d} ريال"


@dataclass
class MockBank:
    today: date = field(default_factory=date.today)

    def __post_init__(self) -> None:
        self._lock = threading.Lock()
        self.reset(self.today)

    # ─── البيانات التجريبية ───
    def reset(self, today: date | None = None) -> None:
        with self._lock:
            self.today = today or date.today()
            d = lambda n: self.today - timedelta(days=n)  # noqa: E731
            self.customers = {
                "C-1001": Customer("C-1001", "خالد"),
                "C-2002": Customer("C-2002", "سالم"),  # عميل آخر لا يصل إليه الوكيل أبداً
            }
            self.accounts = [
                Account("A-1", "C-1001", "الحساب الجاري", "4410", 1_843_275),
                Account("A-2", "C-1001", "حساب التوفير", "7702", 5_000_000),
                Account("A-3", "C-2002", "الحساب الجاري", "5521", 920_000),
            ]
            self.cards = [
                Card("K-1", "C-1001", "بطاقة مدى", "4821"),
                Card("K-2", "C-1001", "البطاقة الائتمانية", "7390"),
                Card("K-3", "C-2002", "بطاقة مدى", "1188"),
            ]
            rows = [
                (1, "نتفليكس", "اشتراكات", -4_500),
                (2, "هايبر ماركت الريم", "بقالة", -32_750),
                (3, "محطة وقود النخيل", "وقود", -12_000),
                (4, "مطعم البيت الشامي", "مطاعم", -8_600),
                (6, "سحب نقدي من صراف آلي", "سحب نقدي", -50_000),
                (8, "مقهى الركن", "مطاعم", -2_300),
                (10, "تحويل دولي إلى حساب في الأردن", "تحويلات", -150_000),
                (10, "رسوم تحويل دولي", "رسوم", -2_500),
                (12, "صيدلية الشفاء", "صحة", -6_450),
                (15, "راتب شهري", "دخل", 1_250_000),
                (18, "مطعم برجر الحي", "مطاعم", -5_400),
                (20, "فاتورة الكهرباء", "فواتير", -38_000),
                (25, "فاتورة الجوال", "فواتير", -11_500),
                (31, "نتفليكس", "اشتراكات", -4_500),
            ]
            self.transactions = [
                Transaction(f"T-{i + 1:03d}", "C-1001", d(n), m, c, a) for i, (n, m, c, a) in enumerate(rows)
            ]
            self.transactions.append(Transaction("T-900", "C-2002", d(2), "متجر إلكترونيات", "تسوق", -210_000))
            self.pending: dict[str, PendingAction] = {}
            self.tickets: list[Ticket] = []
            self.audit: list[dict] = []
            self._executed: dict[str, dict] = {}

    # ─── القراءة: دائماً بمعرّف العميل القادم من الجلسة ───
    def customer(self, customer_id: str) -> Customer:
        return self.customers[customer_id]

    def list_accounts(self, customer_id: str) -> list[Account]:
        return [a for a in self.accounts if a.customer_id == customer_id]

    def list_cards(self, customer_id: str) -> list[Card]:
        return [c for c in self.cards if c.customer_id == customer_id]

    def list_transactions(self, customer_id: str, days: int) -> list[Transaction]:
        since = self.today - timedelta(days=days)
        rows = [t for t in self.transactions if t.customer_id == customer_id and t.day >= since]
        return sorted(rows, key=lambda t: (t.day, t.id), reverse=True)

    # ─── الإجراءات: تُسجَّل معلّقة، وتُنفَّذ بعد تأكيد العميل فقط ───
    def create_pending(self, session_id: str, customer_id: str, kind: str, params: dict, summary: str) -> PendingAction:
        with self._lock:
            action = PendingAction(
                id=f"P-{uuid.uuid4().hex[:6].upper()}",
                session_id=session_id,
                customer_id=customer_id,
                kind=kind,
                params=params,
                summary=summary,
                idempotency_key=str(uuid.uuid4()),
                created_at=time.time(),
            )
            self.pending[action.id] = action
            self._log(customer_id, "إجراء معلّق", f"{action.id} · {summary}")
            return action

    def confirm(self, session_id: str, action_id: str, otp: str) -> dict:
        action = self.pending.get(action_id)
        if action is None or action.session_id != session_id:
            raise BankError("الطلب غير موجود.")
        if action.status == "done":
            return action.result or {}
        if action.status != "pending" or action.is_expired():
            raise BankError("انتهت صلاحية الطلب. اطلبه مرة أخرى.")
        if otp.strip() != DEMO_OTP:
            self._log(action.customer_id, "رمز تحقق خاطئ", action.id)
            raise BankError("رمز التحقق غير صحيح.")
        result = self.execute(action.kind, action.params, action.idempotency_key, action.customer_id)
        with self._lock:
            action.status, action.result = "done", result
        return result

    def cancel(self, session_id: str, action_id: str) -> None:
        action = self.pending.get(action_id)
        if action and action.session_id == session_id and action.status == "pending":
            action.status = "cancelled"
            self._log(action.customer_id, "إلغاء من العميل", action.id)

    def execute(self, kind: str, params: dict, idempotency_key: str, customer_id: str) -> dict:
        """ينفّذ مرة واحدة لكل مفتاح: الضغط مرتين أو إعادة الطلب لا يكرر التنفيذ."""
        with self._lock:
            if idempotency_key in self._executed:
                return self._executed[idempotency_key]
            if kind != "freeze_card":
                raise BankError("إجراء غير مدعوم.")
            card = next(c for c in self.cards if c.id == params["card_id"] and c.customer_id == customer_id)
            card.status = "frozen"
            result = {"status": "done", "card_last4": card.last4, "card_status": "موقوفة مؤقتاً"}
            self._executed[idempotency_key] = result
            self._log(customer_id, "تنفيذ بعد التأكيد", f"إيقاف البطاقة المنتهية بـ {card.last4}")
            return result

    # ─── التذاكر والتدقيق ───
    def create_ticket(self, session_id: str, customer_id: str, reason: str, summary: str) -> Ticket:
        with self._lock:
            ticket = Ticket(f"TK-{1040 + len(self.tickets)}", session_id, customer_id, reason, summary, 4, time.time())
            self.tickets.append(ticket)
            self._log(customer_id, "تحويل لموظف", f"{ticket.id} · {summary}")
            return ticket

    def _log(self, customer_id: str, event: str, detail: str) -> None:
        self.audit.append({"time": time.strftime("%H:%M:%S"), "customer": customer_id, "event": event, "detail": detail})
