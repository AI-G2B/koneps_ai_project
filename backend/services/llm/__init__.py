"""LLM provider 추상화 — Gemini/Claude/OpenAI 어댑터.

서비스 코드는 `call_with_fallback(config, request, timeout=...)` 만 호출하면 되고,
provider 종류와 SDK 차이는 어댑터에서 흡수한다.
"""
from backend.services.llm.base import FilePart, LLMRequest, LLMResponse, LLMProvider
from backend.services.llm.exceptions import (
    ContextOverflowError,
    LLMError,
    LLMTimeoutError,
    ProviderError,
    ProviderUnavailableError,
    RateLimitError,
)
from backend.services.llm.registry import call_with_fallback, get_provider

__all__ = [
    "FilePart",
    "LLMRequest",
    "LLMResponse",
    "LLMProvider",
    "LLMError",
    "RateLimitError",
    "LLMTimeoutError",
    "ContextOverflowError",
    "ProviderError",
    "ProviderUnavailableError",
    "call_with_fallback",
    "get_provider",
]
