"""قاعدة معرفة صغيرة: وثائق Markdown تُقسَّم إلى أقسام، وبحث بالكلمات بعد توحيد العربية.

في الإنتاج يُستبدل البحث هنا ببحث هجين (بالمعنى وبالكلمات)، والمبدأ واحد:
أداة تُرجع أنسب المقاطع مع اسم المصدر وتاريخ تحديثه.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path

from .guards import normalize_ar

STOPWORDS = {
    "في", "من", "علي", "الي", "عن", "مع", "هل", "كم", "ما", "ماذا", "ليش", "لماذا", "وش", "ايش",
    "هو", "هي", "انا", "انت", "عندكم", "عندي", "لو", "او", "ثم", "كل", "بعد", "قبل", "هذا", "هذه",
    "اذا", "لما", "عشان", "اللي", "ابي", "ابغي", "ممكن", "يعني", "اي", "كيف", "متي", "وين",
}
PREFIXES = ("وال", "بال", "كال", "فال", "لل", "ال")  # لا نحذف «و» أو «ب» وحدها: «ورقي» ليست «و+رقي»
SUFFIXES = ("ات", "ون", "ين", "ها", "ه", "ي", "ا")


def stem(word: str) -> str:
    for p in PREFIXES:
        if word.startswith(p) and len(word) - len(p) >= 3:
            word = word[len(p):]
            break
    for _ in range(2):  # «الدولية» ← «دولي» ← «دول»
        for s in SUFFIXES:
            if word.endswith(s) and len(word) - len(s) >= 3:
                word = word[: -len(s)]
                break
    return word


def terms(text: str) -> set[str]:
    words = re.findall(r"[\w٪%]+", normalize_ar(text).lower())
    return {stem(w) for w in words if w not in STOPWORDS and len(w) > 1}


def overlap(query: set[str], doc: set[str]) -> int:
    """كم كلمة من السؤال في النص. الكلمات الطويلة تتطابق بأول أربعة أحرف: «أعترض» تطابق «الاعتراض»."""
    prefixes = {t[:4] for t in doc if len(t) >= 4}
    return sum(1 for q in query if q in doc or (len(q) >= 4 and q[:4] in prefixes))


@dataclass
class Chunk:
    source: str
    section: str
    updated: str
    text: str
    terms: set[str]


class KnowledgeBase:
    def __init__(self, folder: Path):
        self.chunks: list[Chunk] = []
        for path in sorted(folder.glob("*.md")):
            self._load(path.read_text(encoding="utf-8"))

    def _load(self, doc: str) -> None:
        title, updated, section, lines = "", "", "", []

        def flush() -> None:
            if section and lines:
                body = "\n".join(lines).strip()
                self.chunks.append(Chunk(title, section, updated, body, terms(f"{title} {section} {body}")))

        for line in doc.splitlines():
            if line.startswith("# "):
                title = line[2:].strip()
            elif line.startswith("updated:"):
                updated = line.split(":", 1)[1].strip()
            elif line.startswith("## "):
                flush()
                section, lines = line[3:].strip(), []
            elif line.strip():
                lines.append(line.strip())
        flush()

    def search(self, query: str, top_k: int = 3) -> list[Chunk]:
        q = terms(query)
        scored = [(overlap(q, c.terms), c) for c in self.chunks]
        scored = [(s, c) for s, c in scored if s > 0]
        scored.sort(key=lambda sc: sc[0], reverse=True)
        return [c for _, c in scored[:top_k]]
