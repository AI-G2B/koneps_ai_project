"""Provider 레지스트리 + call_with_fallback 헬퍼.

서비스 코드 단순화:
    from backend.services.llm import call_with_fallback, LLMRequest
    response = await call_with_fallback(llm_cfg, request, timeout=180, on_progress=...)
"""
from __future__ import annotations

import asyncio
import logging
import time as _time
from dataclasses import replace
from typing import Callable

from backend.services.llm.base import LLMProvider, LLMRequest, LLMResponse
from backend.services.llm.claude import ClaudeProvider
from backend.services.llm.exceptions import (
    ContextOverflowError,
    LLMError,
    LLMTimeoutError,
    ProviderError,
    ProviderUnavailableError,
    RateLimitError,
)
from backend.services.llm.gemini import GeminiProvider
from backend.services.llm.openai import OpenAIProvider

logger = logging.getLogger(__name__)


_PROVIDERS: dict[str, type[LLMProvider]] = {
    "gemini": GeminiProvider,
    "claude": ClaudeProvider,
    "openai": OpenAIProvider,
}


def get_provider(name: str) -> LLMProvider:
    """provider 인스턴스 반환. 키 미등록 시 ProviderUnavailableError raise."""
    cls = _PROVIDERS.get(name)
    if cls is None:
        raise ProviderUnavailableError(f"알 수 없는 provider: {name}")
    return cls()


# call_with_fallback 가 받는 LLMConfig는 dataclass 또는 .provider/.model 속성을 가진 객체.
# 순환 import 피하려고 protocol 처럼 duck-type만 기대.
ProgressCallback = Callable[[str, str], None]  # (message, level)


async def call_with_fallback(
    config,
    request: LLMRequest,
    *,
    timeout: float,
    on_progress: ProgressCallback | None = None,
) -> LLMResponse:
    """primary → fallback 순서로 호출 시도.

    각 시도마다 timeout 적용. RateLimit/Timeout/ContextOverflow/ProviderError 시 다음으로.
    모든 시도 실패 시 마지막 예외 raise.
    """
    attempts: list[tuple[str, str]] = [(config.provider, config.model)]
    fb_model = getattr(config, "fallback_model", None)
    fb_provider = getattr(config, "fallback_provider", None) or config.provider
    if fb_model and (fb_provider != config.provider or fb_model != config.model):
        attempts.append((fb_provider, fb_model))

    last_error: LLMError | None = None
    for idx, (provider_name, model) in enumerate(attempts):
        emit_msg = f"LLM 호출 시작 ({provider_name}/{model})"
        if on_progress:
            on_progress(emit_msg, "info")
        else:
            logger.info(emit_msg)

        try:
            provider = get_provider(provider_name)
        except ProviderUnavailableError as e:
            last_error = e
            msg = f"{provider_name} 사용 불가: {e}"
            if on_progress:
                on_progress(msg, "warning")
            logger.warning(msg)
            continue

        _t0 = _time.monotonic()
        req = replace(request, model=model)
        try:
            response = await asyncio.wait_for(provider.generate(req), timeout=timeout)
            elapsed = _time.monotonic() - _t0
            success_msg = f"LLM 응답 수신 ({elapsed:.1f}초, {provider_name}/{model})"
            if on_progress:
                on_progress(success_msg, "success")
            else:
                logger.info(success_msg)
            return response
        except asyncio.TimeoutError as e:
            last_error = LLMTimeoutError(f"{provider_name}/{model} 타임아웃 {timeout}초")
            msg = f"{provider_name}/{model} 응답 타임아웃 — 다음 시도"
            if on_progress:
                on_progress(msg, "warning")
            logger.warning(msg)
        except (RateLimitError, ContextOverflowError, ProviderError) as e:
            last_error = e
            msg = f"{provider_name}/{model} 실패 ({type(e).__name__}): {str(e)[:80]} — 다음 시도"
            if on_progress:
                on_progress(msg, "warning")
            logger.warning(msg)

        # 마지막 시도 아니면 다음 attempt로
        if idx < len(attempts) - 1:
            continue

    raise last_error or RuntimeError("LLM 호출 모든 시도 실패")
