"""الإعدادات من متغيرات البيئة. انظر .env.example."""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


@dataclass(frozen=True)
class Settings:
    provider: str
    anthropic_model: str
    effort: str
    local_base_url: str
    local_model: str
    local_api_key: str
    prompt_version: str
    sim_delay: float


def load_settings() -> Settings:
    has_key = bool(os.getenv("ANTHROPIC_API_KEY") or os.getenv("ANTHROPIC_AUTH_TOKEN"))
    return Settings(
        provider=os.getenv("LLM_PROVIDER") or ("anthropic" if has_key else "scripted"),
        anthropic_model=os.getenv("ANTHROPIC_MODEL", "claude-opus-5"),
        effort=os.getenv("EFFORT", "low"),
        local_base_url=os.getenv("LOCAL_BASE_URL", "http://localhost:11434/v1"),
        local_model=os.getenv("LOCAL_MODEL", "qwen2.5:14b"),
        local_api_key=os.getenv("LOCAL_API_KEY", ""),
        prompt_version=os.getenv("PROMPT_VERSION", "sanad-v2"),
        sim_delay=float(os.getenv("SIM_DELAY", "0.7")),
    )


def load_prompt(version: str) -> str:
    return (ROOT / "prompts" / f"{version}.md").read_text(encoding="utf-8")
