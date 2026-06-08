"""LLM 활성 설정 저장소.

- `llm_config` 싱글톤 row(id=1) : provider/model/fallback/temperature
- `provider_models`              : provider별 등록 모델 (admin이 새 버전 등장 시 추가)

API 키는 .env에 둠 (운영자 셋업). admin UI는 키 존재 여부만 노출(`is_available`).

설계 포인트:
- get_active_config: in-memory 캐시 + updated_at 비교로 multi-worker invalidation.
- 3c 단계는 provider='gemini' 한정 동작. Claude/OpenAI는 UI에서 선택은 되지만 실 호출은 3d에서 활성화.
"""
from __future__ import annotations

import asyncio
import logging
import os
from dataclasses import dataclass
from datetime import datetime
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from backend.config import get_settings

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Provider 메타 — 환경변수 이름, 표시 라벨, 기본 모델 시드 목록
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class ProviderMeta:
    name: str            # 내부 키 ('gemini', 'claude', 'openai')
    label: str           # 표시 이름
    env_var: str         # API 키 환경변수
    default_models: tuple[tuple[str, str], ...]  # (model_id, label)


PROVIDERS: tuple[ProviderMeta, ...] = (
    ProviderMeta(
        name="gemini",
        label="Google Gemini",
        env_var="GEMINI_API_KEY",
        default_models=(
            ("gemini-3.1-pro-preview", "Gemini 3.1 Pro (preview)"),
            ("gemini-3.0-pro", "Gemini 3.0 Pro"),
            ("gemini-2.5-pro", "Gemini 2.5 Pro"),
            ("gemini-2.5-flash", "Gemini 2.5 Flash"),
            ("gemini-2.5-flash-lite", "Gemini 2.5 Flash Lite"),
        ),
    ),
    ProviderMeta(
        name="claude",
        label="Anthropic Claude",
        env_var="ANTHROPIC_API_KEY",
        default_models=(
            ("claude-opus-4-7", "Claude Opus 4.7"),
            ("claude-sonnet-4-6", "Claude Sonnet 4.6"),
            ("claude-haiku-4-5-20251001", "Claude Haiku 4.5"),
        ),
    ),
    ProviderMeta(
        name="openai",
        label="OpenAI",
        env_var="OPENAI_API_KEY",
        default_models=(
            ("gpt-5", "GPT-5"),
            ("gpt-5-mini", "GPT-5 mini"),
            ("gpt-4.1", "GPT-4.1"),
            ("gpt-4o", "GPT-4o"),
        ),
    ),
)


PROVIDER_BY_NAME: dict[str, ProviderMeta] = {p.name: p for p in PROVIDERS}


def is_provider_available(provider: str) -> bool:
    meta = PROVIDER_BY_NAME.get(provider)
    if not meta:
        return False
    return bool(os.getenv(meta.env_var, "").strip())


# ---------------------------------------------------------------------------
# 캐시
# ---------------------------------------------------------------------------


@dataclass
class LLMConfig:
    provider: str
    model: str
    fallback_provider: str | None
    fallback_model: str | None
    temperature: float
    updated_at: datetime | None


_CACHE: LLMConfig | None = None
_CACHE_AT: datetime | None = None
_LOCK = asyncio.Lock()


# ---------------------------------------------------------------------------
# 시드 + 조회
# ---------------------------------------------------------------------------


async def seed_llm_config(db: AsyncSession) -> None:
    """초기 row(id=1) + provider_models 기본 목록을 idempotent하게 등록."""
    settings = get_settings()
    primary = settings.gemini_model or "gemini-2.5-pro"
    fallback = settings.gemini_fallback_model or None
    await db.execute(
        text("""
            INSERT INTO llm_config (id, provider, model, fallback_provider, fallback_model, temperature)
                 VALUES (1, :provider, :model, :fb_provider, :fb_model, :temp)
            ON CONFLICT (id) DO NOTHING
        """),
        {
            "provider": "gemini",
            "model": primary,
            "fb_provider": "gemini" if fallback else None,
            "fb_model": fallback,
            "temp": 0.1,
        },
    )
    for p in PROVIDERS:
        for model_id, label in p.default_models:
            is_default = (p.name == "gemini" and model_id == primary)
            await db.execute(
                text("""
                    INSERT INTO provider_models (provider, model, label, is_default)
                         VALUES (:p, :m, :l, :d)
                    ON CONFLICT (provider, model) DO NOTHING
                """),
                {"p": p.name, "m": model_id, "l": label, "d": is_default},
            )
    await db.commit()


async def get_active_config(db: AsyncSession) -> LLMConfig:
    """현재 활성 설정. updated_at 비교로 캐시 무효화."""
    global _CACHE, _CACHE_AT
    row = (await db.execute(
        text("SELECT updated_at FROM llm_config WHERE id = 1"),
    )).first()
    db_updated_at: datetime | None = row[0] if row else None

    if _CACHE is not None and _CACHE_AT == db_updated_at:
        return _CACHE

    async with _LOCK:
        full = (await db.execute(
            text("""
                SELECT provider, model, fallback_provider, fallback_model, temperature, updated_at
                  FROM llm_config WHERE id = 1
            """),
        )).first()
        if not full:
            # 시드 누락 — env로부터 즉시 채움
            settings = get_settings()
            return LLMConfig(
                provider="gemini",
                model=settings.gemini_model or "gemini-2.5-pro",
                fallback_provider="gemini",
                fallback_model=settings.gemini_fallback_model,
                temperature=0.1,
                updated_at=None,
            )
        _CACHE = LLMConfig(
            provider=full[0],
            model=full[1],
            fallback_provider=full[2],
            fallback_model=full[3],
            temperature=float(full[4]),
            updated_at=full[5],
        )
        _CACHE_AT = full[5]
    return _CACHE


# ---------------------------------------------------------------------------
# 변경 API
# ---------------------------------------------------------------------------


async def save_config(
    *,
    provider: str,
    model: str,
    fallback_provider: str | None,
    fallback_model: str | None,
    temperature: float,
    user_id: int | None,
    db: AsyncSession,
) -> LLMConfig:
    if provider not in PROVIDER_BY_NAME:
        raise ValueError(f"알 수 없는 provider: {provider}")
    if not model.strip():
        raise ValueError("model이 비어있습니다")
    if fallback_provider and fallback_provider not in PROVIDER_BY_NAME:
        raise ValueError(f"알 수 없는 fallback provider: {fallback_provider}")
    if not (0.0 <= temperature <= 2.0):
        raise ValueError("temperature는 0.0 ~ 2.0 범위여야 합니다")

    await db.execute(
        text("""
            INSERT INTO llm_config (id, provider, model, fallback_provider, fallback_model, temperature, updated_at, updated_by)
                 VALUES (1, :provider, :model, :fb_provider, :fb_model, :temp, NOW(), :user_id)
            ON CONFLICT (id) DO UPDATE
                SET provider = EXCLUDED.provider,
                    model = EXCLUDED.model,
                    fallback_provider = EXCLUDED.fallback_provider,
                    fallback_model = EXCLUDED.fallback_model,
                    temperature = EXCLUDED.temperature,
                    updated_at = NOW(),
                    updated_by = EXCLUDED.updated_by
        """),
        {
            "provider": provider,
            "model": model,
            "fb_provider": fallback_provider,
            "fb_model": fallback_model,
            "temp": temperature,
            "user_id": user_id,
        },
    )
    await db.commit()
    global _CACHE, _CACHE_AT
    _CACHE = None
    _CACHE_AT = None
    return await get_active_config(db)


# ---------------------------------------------------------------------------
# 모델 레지스트리
# ---------------------------------------------------------------------------


async def list_provider_models(provider: str, db: AsyncSession) -> list[dict[str, Any]]:
    rows = (await db.execute(
        text("""
            SELECT model, label, is_default
              FROM provider_models
             WHERE provider = :p
             ORDER BY is_default DESC, model
        """),
        {"p": provider},
    )).all()
    return [{"model": r[0], "label": r[1], "is_default": r[2]} for r in rows]


async def add_provider_model(
    provider: str, model: str, label: str | None, db: AsyncSession
) -> dict[str, Any]:
    if provider not in PROVIDER_BY_NAME:
        raise ValueError(f"알 수 없는 provider: {provider}")
    model = model.strip()
    if not model:
        raise ValueError("model이 비어있습니다")
    await db.execute(
        text("""
            INSERT INTO provider_models (provider, model, label)
                 VALUES (:p, :m, :l)
            ON CONFLICT (provider, model) DO UPDATE
                SET label = COALESCE(EXCLUDED.label, provider_models.label)
        """),
        {"p": provider, "m": model, "l": label},
    )
    await db.commit()
    return {"provider": provider, "model": model, "label": label}


async def remove_provider_model(provider: str, model: str, db: AsyncSession) -> bool:
    res = await db.execute(
        text("DELETE FROM provider_models WHERE provider = :p AND model = :m"),
        {"p": provider, "m": model},
    )
    await db.commit()
    return res.rowcount > 0


# ---------------------------------------------------------------------------
# Admin 전체 조회
# ---------------------------------------------------------------------------


async def describe_providers(db: AsyncSession) -> list[dict[str, Any]]:
    """provider별: 환경변수 이름·is_available·등록된 모델 목록."""
    out: list[dict[str, Any]] = []
    for p in PROVIDERS:
        models = await list_provider_models(p.name, db)
        out.append({
            "provider": p.name,
            "label": p.label,
            "env_var": p.env_var,
            "is_available": is_provider_available(p.name),
            "models": models,
        })
    return out
