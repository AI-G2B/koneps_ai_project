"""관리자 전용 라우트.

- /admin/health         : 3a 자가 점검 핑
- /admin/prompts/*      : 3b 프롬프트 관리 (목록·상세·갱신·히스토리·롤백·기본값 복원)
"""
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.security import require_admin
from backend.db.database import get_db
from backend.db.models import User
from backend.services import analysis_queue
from backend.services.llm import LLMError, LLMRequest, call_with_fallback
from backend.services.llm_config_store import (
    PROVIDER_BY_NAME,
    add_provider_model,
    describe_providers,
    get_active_config,
    is_provider_available,
    list_provider_models,
    remove_provider_model,
    save_config,
)
from backend.services.prompt_store import (
    get_defaults,
    get_prompt_detail,
    get_prompt_history,
    list_prompts,
    reset_prompt,
    rollback_prompt,
    save_prompt,
    seed_prompts,
)
from sqlalchemy import text

router = APIRouter()


@router.get("/health", summary="관리자 콘솔 헬스 체크")
async def admin_health() -> dict:
    """가드 동작 확인용 핑."""
    return {"ok": True, "phase": "3b"}


# ---------------------------------------------------------------------------
# 프롬프트 관리
# ---------------------------------------------------------------------------


class PromptUpdateRequest(BaseModel):
    content: str = Field(..., min_length=1)


class PromptRollbackRequest(BaseModel):
    version: int = Field(..., ge=1)


@router.get("/prompts", summary="프롬프트 목록 (key, description, version, updated_at)")
async def list_prompts_endpoint(
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[dict]:
    return await list_prompts(db)


@router.get("/prompts/{key}", summary="프롬프트 상세 (content + default_content)")
async def get_prompt_endpoint(
    key: str,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    detail = await get_prompt_detail(key, db)
    if not detail:
        raise HTTPException(status_code=404, detail="해당 프롬프트가 없습니다.")
    return detail


@router.put("/prompts/{key}", summary="프롬프트 갱신 (필수 placeholder 검증)")
async def update_prompt_endpoint(
    key: str,
    body: PromptUpdateRequest,
    current: Annotated[User, Depends(require_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    defaults = get_defaults()
    if key not in defaults:
        raise HTTPException(status_code=404, detail=f"알 수 없는 프롬프트 키: {key}")
    try:
        return await save_prompt(key, body.content, current.id, db)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/prompts/{key}/history", summary="프롬프트 변경 이력")
async def prompt_history_endpoint(
    key: str,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[dict]:
    defaults = get_defaults()
    if key not in defaults:
        raise HTTPException(status_code=404, detail=f"알 수 없는 프롬프트 키: {key}")
    return await get_prompt_history(key, db)


@router.post("/prompts/{key}/rollback", summary="이전 버전으로 롤백")
async def prompt_rollback_endpoint(
    key: str,
    body: PromptRollbackRequest,
    current: Annotated[User, Depends(require_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    try:
        return await rollback_prompt(key, body.version, current.id, db)
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/prompts/{key}/reset", summary="기본값으로 복원")
async def prompt_reset_endpoint(
    key: str,
    current: Annotated[User, Depends(require_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    try:
        return await reset_prompt(key, current.id, db)
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))


# ---------------------------------------------------------------------------
# LLM 설정 + provider/model 관리
# ---------------------------------------------------------------------------


class LLMConfigUpdateRequest(BaseModel):
    provider: str = Field(..., min_length=1)
    model: str = Field(..., min_length=1)
    fallback_provider: str | None = None
    fallback_model: str | None = None
    temperature: float = Field(0.1, ge=0.0, le=2.0)


class ProviderModelRequest(BaseModel):
    model: str = Field(..., min_length=1)
    label: str | None = None


@router.get("/llm-config", summary="활성 LLM 설정")
async def get_llm_config_endpoint(
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    cfg = await get_active_config(db)
    return {
        "provider": cfg.provider,
        "model": cfg.model,
        "fallback_provider": cfg.fallback_provider,
        "fallback_model": cfg.fallback_model,
        "temperature": cfg.temperature,
        "updated_at": cfg.updated_at.isoformat() if cfg.updated_at else None,
    }


@router.put("/llm-config", summary="활성 LLM 설정 변경")
async def update_llm_config_endpoint(
    body: LLMConfigUpdateRequest,
    current: Annotated[User, Depends(require_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    try:
        cfg = await save_config(
            provider=body.provider,
            model=body.model,
            fallback_provider=body.fallback_provider,
            fallback_model=body.fallback_model,
            temperature=body.temperature,
            user_id=current.id,
            db=db,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    # 활성 provider가 환경변수 미등록 상태면 경고 (저장은 허용 — 운영자가 .env 등록 후 사용 가능).
    warning = None
    if not is_provider_available(cfg.provider):
        warning = f"{cfg.provider} 의 API 키가 .env에 없습니다 — 호출 시 실패합니다."
    return {
        "provider": cfg.provider,
        "model": cfg.model,
        "fallback_provider": cfg.fallback_provider,
        "fallback_model": cfg.fallback_model,
        "temperature": cfg.temperature,
        "updated_at": cfg.updated_at.isoformat() if cfg.updated_at else None,
        "warning": warning,
    }


@router.get("/providers", summary="provider 목록 + 환경변수 키 감지 + 등록 모델")
async def list_providers_endpoint(
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[dict]:
    return await describe_providers(db)


@router.post("/providers/{provider}/models", summary="새 모델 등록")
async def add_model_endpoint(
    provider: str,
    body: ProviderModelRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    if provider not in PROVIDER_BY_NAME:
        raise HTTPException(status_code=404, detail=f"알 수 없는 provider: {provider}")
    try:
        return await add_provider_model(provider, body.model, body.label, db)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/providers/{provider}/models/{model:path}", summary="등록 모델 삭제")
async def remove_model_endpoint(
    provider: str,
    model: str,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    if provider not in PROVIDER_BY_NAME:
        raise HTTPException(status_code=404, detail=f"알 수 없는 provider: {provider}")
    deleted = await remove_provider_model(provider, model, db)
    return {"deleted": deleted, "provider": provider, "model": model}


@router.get("/providers/{provider}/models", summary="provider의 등록 모델 목록")
async def list_provider_models_endpoint(
    provider: str,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[dict]:
    if provider not in PROVIDER_BY_NAME:
        raise HTTPException(status_code=404, detail=f"알 수 없는 provider: {provider}")
    return await list_provider_models(provider, db)


# ---------------------------------------------------------------------------
# 운영 (Phase 4) — status + 유지보수 액션
# ---------------------------------------------------------------------------


@router.get("/ops/status", summary="운영 상태 요약 (자동분석·캐시·시드)")
async def ops_status_endpoint(
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    today_count = analysis_queue._DAILY_COUNT.get(__import__("datetime").date.today(), 0)
    active_count = len(analysis_queue._ACTIVE)

    stuck_row = (await db.execute(
        text("SELECT COUNT(*) FROM notices WHERE pipeline_status = 'analyzing'")
    )).first()
    stuck_count = int(stuck_row[0]) if stuck_row else 0

    cached_row = (await db.execute(
        text("""
            SELECT
                COUNT(*) FILTER (WHERE converted_md IS NOT NULL) AS cached,
                COUNT(*) FILTER (WHERE conversion_source = 'libreai') AS libreai_cached,
                COUNT(*) FILTER (WHERE conversion_source = 'pypdf') AS pypdf_cached
              FROM attachments
        """)
    )).first()

    poison_row = (await db.execute(
        text("SELECT COUNT(*) FROM analysis_results WHERE poison_clauses IS NOT NULL")
    )).first()

    prompts_row = (await db.execute(
        text("SELECT COUNT(*) FROM prompts")
    )).first()
    llm_cfg_row = (await db.execute(
        text("SELECT 1 FROM llm_config WHERE id = 1")
    )).first()

    return {
        "analysis": {
            "concurrency_limit": analysis_queue.CONCURRENCY,
            "daily_cap": analysis_queue.DAILY_CAP,
            "daily_count": today_count,
            "active_in_flight": active_count,
            "backoff_sec": analysis_queue.BACKOFF_SEC,
        },
        "attachments": {
            "converted_total": int(cached_row[0]) if cached_row else 0,
            "converted_libreai": int(cached_row[1]) if cached_row else 0,
            "converted_pypdf": int(cached_row[2]) if cached_row else 0,
        },
        "notices": {
            "stuck_analyzing": stuck_count,
        },
        "analysis_results": {
            "with_poison_clauses": int(poison_row[0]) if poison_row else 0,
        },
        "seed": {
            "prompts_count": int(prompts_row[0]) if prompts_row else 0,
            "llm_config_seeded": bool(llm_cfg_row),
        },
    }


class TestLLMRequest(BaseModel):
    user_text: str = Field(default="1+1=?", min_length=1, max_length=2000)


@router.post("/ops/test-llm", summary="현재 활성 LLM 설정으로 가벼운 호출 테스트")
async def ops_test_llm_endpoint(
    body: TestLLMRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    import time as _time
    cfg = await get_active_config(db)
    req = LLMRequest(
        system="간결한 한국어로 답하라.",
        user_text=body.user_text,
        model=cfg.model,
        temperature=0.0,
        response_json=False,
    )
    _t0 = _time.monotonic()
    try:
        resp = await call_with_fallback(cfg, req, timeout=30)
    except LLMError as e:
        return {"ok": False, "error": str(e), "elapsed_sec": _time.monotonic() - _t0}
    return {
        "ok": True,
        "provider": resp.provider,
        "model_used": resp.model_used,
        "input_tokens": resp.input_tokens,
        "output_tokens": resp.output_tokens,
        "text": resp.text[:500],
        "elapsed_sec": round(_time.monotonic() - _t0, 2),
    }


@router.post("/ops/reset-stuck", summary="stuck 'analyzing' 공고를 즉시 collected로 복귀")
async def ops_reset_stuck_endpoint(
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    res = await db.execute(text("""
        UPDATE notices SET pipeline_status = 'collected'
         WHERE pipeline_status = 'analyzing'
    """))
    await db.commit()
    return {"reset_count": res.rowcount}


class WipeConvertedRequest(BaseModel):
    source: str | None = Field(None, description="'libreai' | 'pypdf' | null(전체)")


@router.post("/ops/wipe-converted-md", summary="첨부 텍스트 변환 캐시 일괄 wipe")
async def ops_wipe_converted_md_endpoint(
    body: WipeConvertedRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    if body.source and body.source not in ("libreai", "pypdf"):
        raise HTTPException(status_code=400, detail="source는 'libreai' / 'pypdf' / null만 허용")
    if body.source:
        res = await db.execute(
            text("""
                UPDATE attachments
                   SET converted_md = NULL, converted_at = NULL, conversion_source = NULL
                 WHERE conversion_source = :s
            """),
            {"s": body.source},
        )
    else:
        res = await db.execute(text("""
            UPDATE attachments
               SET converted_md = NULL, converted_at = NULL, conversion_source = NULL
             WHERE converted_md IS NOT NULL
        """))
    await db.commit()
    return {"wiped_count": res.rowcount, "source": body.source or "all"}


@router.post("/ops/wipe-poison-clauses", summary="기존 분석의 poison_clauses 컬럼 NULL로 일괄 삭제")
async def ops_wipe_poison_endpoint(
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    res = await db.execute(text("""
        UPDATE analysis_results SET poison_clauses = NULL
         WHERE poison_clauses IS NOT NULL
    """))
    await db.commit()
    return {"wiped_count": res.rowcount}


@router.post("/ops/reseed-prompts", summary="코드의 신규 프롬프트 키를 DB에 INSERT (기존 키는 무시)")
async def ops_reseed_prompts_endpoint(
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    before = (await db.execute(text("SELECT COUNT(*) FROM prompts"))).first()
    await seed_prompts(db)
    after = (await db.execute(text("SELECT COUNT(*) FROM prompts"))).first()
    return {"before": int(before[0]) if before else 0, "after": int(after[0]) if after else 0}
