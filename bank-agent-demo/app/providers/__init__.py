"""اختيار النموذج من الإعدادات. تبديل النموذج لا يغيّر شيئاً في الوكيل أو أدواته."""

from __future__ import annotations

from ..config import Settings
from .base import ModelTurn, Provider, ToolCall

__all__ = ["ModelTurn", "Provider", "ToolCall", "make_provider"]


def make_provider(settings: Settings) -> Provider:
    if settings.provider == "anthropic":
        from .anthropic_provider import AnthropicProvider
        return AnthropicProvider(model=settings.anthropic_model, effort=settings.effort)
    if settings.provider == "local":
        from .openai_compat import OpenAICompatProvider
        return OpenAICompatProvider(settings.local_base_url, settings.local_model, settings.local_api_key)
    if settings.provider == "scripted":
        from .scripted import ScriptedProvider
        return ScriptedProvider(delay=settings.sim_delay)
    raise ValueError(f"LLM_PROVIDER غير معروف: {settings.provider} (المتاح: anthropic, local, scripted)")
