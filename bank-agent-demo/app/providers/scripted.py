"""محاكاة بدون إنترنت للعرض.

المسار نفسه تماماً: الحواجز، والأدوات الحقيقية على البنك الوهمي، والتأكيد، والتحويل، والسجل.
الفرق الوحيد أن قرار «أي أداة أستدعي» وصياغة الرد يأتيان من قواعد ثابتة بدل نموذج لغوي.
لذلك يفهم أسئلة العرض وما يشبهها فقط. قل ذلك بوضوح إن استخدمته أمام البنك.
"""

from __future__ import annotations

import json
import re
import time
from datetime import date

from ..guards import normalize_ar
from ..knowledge import overlap, terms
from .base import ModelTurn, ToolCall


def _kw(*words: str) -> tuple[str, ...]:
    return tuple(normalize_ar(w) for w in words)


OTHERS = _kw("أخوي", "أخي", "أختي", "زوجتي", "أبوي", "حساب غيري", "حساب رقم", "حساب صاحبي")
INVEST = _kw("استثمار", "أسهم", "سهم", "صندوق")
HUMAN = _kw("موظف", "أكلم", "اكلم", "إنسان", "شكوى", "أحد يرد")
CARD_STOP = _kw("ضاعت", "ضايعة", "فقدت", "سرقت", "انسرقت", "أوقف", "وقف", "اقفل", "جمد")
CARD = _kw("بطاقة", "بطاقتي", "كرت")
FEES = _kw("رسوم", "رسم", "عمولة", "كم ياخذون")
POLICY = _kw("اعتراض", "أعترض", "اعترض", "حد ", "حدود", "بديلة", "مستفيد", "احتيال")
SPEND = _kw("صرفت", "مصاريف", "مصروفات", "انفقت")
BALANCE = _kw("رصيد", "كم عندي", "كم في حسابي")
TXN = _kw("انخصم", "خصم", "خصموا", "عملية", "عمليات", "دفعت", "سحب")
HELLO = _kw("السلام", "مرحبا", "هلا", "أهلا")
HELP = ("أقدر أساعدك في عملياتك الأخيرة، ورصيدك، ومصاريفك، وإيقاف البطاقة، ورسوم الخدمات، "
        "أو أحوّلك لموظف. وش تحتاج؟")


def has(text: str, words: tuple[str, ...]) -> bool:
    return any(w in text for w in words)


def day_word(iso: str) -> str:
    n = (date.today() - date.fromisoformat(iso)).days
    return {0: "اليوم", 1: "أمس", 2: "قبل يومين"}.get(n, f"قبل {n} أيام" if n <= 10 else f"قبل {n} يوماً")


class ScriptedProvider:
    name = "scripted"
    label = "محاكاة بدون إنترنت"

    def __init__(self, delay: float = 0.0) -> None:
        self._n = 0
        self.delay = delay  # يبطئ العرض فقط، ليتابع الحضور كل خطوة في لوحة «خلف الكواليس»

    def _call(self, name: str, **args) -> ModelTurn:
        self._n += 1
        return ModelTurn("", [ToolCall(f"sim_{self._n}", name, args)], "tool_use", model="scripted")

    @staticmethod
    def _say(text: str) -> ModelTurn:
        return ModelTurn(text, [], "end", model="scripted")

    def step(self, system_prompt: str, session_block: str, history: list[dict], tools: list[dict]) -> ModelTurn:
        if self.delay:
            time.sleep(self.delay)
        last = max(i for i, e in enumerate(history) if e["role"] == "user")
        text = normalize_ar(history[last]["text"])
        results = {e["name"]: e for e in history[last + 1:] if e["role"] == "tool"}
        return self._final(text, results) if results else self._first(text)

    # ─── القرار الأول: رد مباشر أو أداة ───
    def _first(self, t: str) -> ModelTurn:
        if has(t, OTHERS):
            return self._say("ما أقدر أعرض بيانات أي حساب غير حسابك، حتى لو كان لأحد أفراد عائلتك. "
                             "صاحب الحساب يقدر يطّلع عليها من تطبيقه أو من الفرع.")
        if has(t, INVEST):
            return self._say("ما أقدر أعطي نصيحة استثمارية، لكن أقدر أحوّلك لمستشار الاستثمار في البنك. تبغى؟")
        if has(t, HUMAN):
            reason = "complaint" if has(t, _kw("شكوى")) else "customer_request"
            return self._call("handoff_to_human", reason=reason, summary="العميل طلب التحدث مع موظف من المساعد الرقمي.")
        if has(t, FEES) or has(t, POLICY):
            return self._call("search_knowledge", query=t)
        if has(t, CARD_STOP) and has(t, CARD):
            m = re.search(r"(?<!\d)(\d{4})(?!\d)", t)
            if not m:
                return self._say("أي بطاقة تقصد؟ اكتب لي آخر أربعة أرقام منها.")
            reason = "stolen" if "سرق" in t else ("lost" if has(t, _kw("ضاع", "ضايع", "فقد")) else "temporary")
            return self._call("freeze_card", card_last4=m.group(1), reason=reason)
        if has(t, SPEND):
            return self._call("spending_summary", days=30)
        if has(t, BALANCE):
            return self._call("get_accounts")
        if has(t, TXN):
            recent = has(t, _kw("أمس", "امس", "اليوم", "أسبوع"))
            return self._call("list_transactions", days=7 if recent else 30, only_debits=True)
        if has(t, HELLO):
            return self._say("وعليكم السلام، أنا سند، مساعدك الرقمي في بنك الأمل. " + HELP)
        return self._say(HELP)

    # ─── الرد بعد نتيجة الأداة ───
    def _final(self, t: str, results: dict) -> ModelTurn:
        name, ev = next(iter(results.items()))
        if ev["is_error"]:
            return self._say(self._error_reply(ev["output"]))
        data = json.loads(ev["output"])

        if name == "handoff_to_human":
            return self._say(f"حوّلتك لأحد موظفينا، ورقم طلبك {data['ticket']}. الانتظار المتوقع حوالي "
                             f"{data['wait_minutes']} دقائق، وسيرى الموظف ملخص محادثتنا فلا تحتاج تعيد شرح طلبك.")
        if name == "freeze_card":
            last4 = re.search(r"(?<!\d)(\d{4})(?!\d)", t).group(1)
            return self._say(f"جهّزت طلب إيقاف البطاقة المنتهية بـ {last4}. أكّد الطلب من الشاشة التي ظهرت لك، "
                             "ويتم الإيقاف مباشرة بعد تأكيدك.")
        if name == "search_knowledge":
            q, wants_number = terms(t), has(t, _kw("كم", "متى", "حد"))
            best = max(((overlap(q, terms(line)) + (0.5 if wants_number and re.search(r"\d", line) else 0), line, hit["source"])
                        for hit in data for line in hit["text"].split("\n")), key=lambda x: x[0])
            return self._say(f"{best[1]}\nالمصدر: «{best[2]}».")
        if name == "spending_summary":
            for c in data["by_category"]:
                if normalize_ar(c["category"]) in t:
                    return self._say(f"صرفت على {c['category']} خلال آخر {data['days']} يوماً {c['amount']}.")
            top = "، ".join(f"{c['category']} {c['amount']}" for c in data["by_category"][:3])
            return self._say(f"خلال آخر {data['days']} يوماً صرفت {data['total']}، من دون التحويلات والسحب النقدي. "
                             f"أعلى الفئات: {top}.")
        if name == "get_accounts":
            return self._say("، و".join(f"رصيد {a['account']} {a['balance']}" for a in data) + ".")
        if name == "list_transactions":
            m = re.search(r"(?<![\d.])(\d+(?:\.\d+)?)", t)
            for r in data:
                if m and abs(float(r["amount"].split()[0].replace(",", "")) - float(m.group(1))) < 0.005:
                    extra = ("، وهو اشتراك شهري متكرر. إذا ما تعرفه، أقدر أحوّلك لموظف يفتح لك اعتراضاً عليه."
                             if r["category"] == "اشتراكات" else ".")
                    return self._say(f"انخصم منك {r['amount']} {day_word(r['date'])} لصالح «{r['merchant']}»{extra}")
            recent = "، ".join(f"{r['merchant']} {r['amount']} ({day_word(r['date'])})" for r in data[:3])
            return self._say(f"آخر خصوماتك: {recent}.")
        return self._say(HELP)

    @staticmethod
    def _error_reply(output: str) -> str:
        if "موقوفة مسبقاً" in output:
            return "هذه البطاقة موقوفة مسبقاً، ولا تحتاج تعمل شيئاً الآن."
        if "لا توجد بطاقة" in output:
            return "ما لقيت بطاقة بهذه الأرقام في حساباتك. تأكد من آخر أربعة أرقام واكتبها لي."
        if "لا توجد وثيقة" in output:
            return "ما لقيت إجابة لهذا السؤال في وثائق البنك. تبغى أحوّلك لموظف؟"
        return "واجهت مشكلة في النظام الآن. تبغى أحوّلك لموظف؟"
