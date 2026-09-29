"""حواجز الإدخال والإخراج: توحيد النص، وإخفاء الأرقام الطويلة، ومطابقة المبالغ."""

from __future__ import annotations

import re
from dataclasses import dataclass

DIGITS = str.maketrans("٠١٢٣٤٥٦٧٨٩٫٬", "0123456789.,")
AR_LETTERS = str.maketrans({"أ": "ا", "إ": "ا", "آ": "ا", "ة": "ه", "ى": "ي", "ـ": None})
DIACRITICS = re.compile(r"[ً-ْ]")
LONG_NUMBER = re.compile(r"\d{9,}")
AMOUNT = re.compile(r"\d[\d,]*\.\d{2}")


def normalize_digits(text: str) -> str:
    return text.translate(DIGITS)


def normalize_ar(text: str) -> str:
    """توحيد الكتابة العربية للبحث والمطابقة: الهمزات والتاء المربوطة والتشكيل والأرقام."""
    return DIACRITICS.sub("", normalize_digits(text)).translate(AR_LETTERS)


def mask(text: str) -> str:
    """يستبدل أي رقم من 9 خانات أو أكثر (بطاقة، هوية، حساب) بآخر أربعة أرقام."""
    return LONG_NUMBER.sub(lambda m: "••••" + m.group()[-4:], text)


def guard_input(text: str) -> str:
    """ما يكتبه العميل يمر من هنا قبل النموذج: أرقام البطاقات والهويات الكاملة لا تصل إليه."""
    return mask(normalize_digits(text.strip()))


@dataclass
class OutputCheck:
    ok: bool
    text: str
    detail: str


def guard_output(reply: str, tool_outputs: list[str]) -> OutputCheck:
    """كل مبلغ في رد الوكيل يجب أن يظهر حرفياً في نتيجة أداة من هذه المحادثة."""
    reply = normalize_digits(reply)
    seen = " ".join(tool_outputs)
    amounts = AMOUNT.findall(reply)
    for amount in amounts:
        if amount not in seen:
            return OutputCheck(False, reply, f"المبلغ {amount} لم يرد في أي نتيجة أداة")
    detail = "كل المبالغ مطابقة لنتائج الأدوات" if amounts else "لا مبالغ في الرد"
    return OutputCheck(True, mask(reply), detail)
