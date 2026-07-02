"""프롬프트 동적 저장소.

코드의 정적 상수를 DB의 'prompts' 테이블로 옮겨 admin이 편집할 수 있게 한다.
모듈 임포트 시점엔 DB가 준비되지 않을 수 있으므로 seed는 lifespan에서 호출한다.

설계:
- PROMPT_DEFAULTS: key → (content, description, placeholders[]) 시드값. 코드 변경 + 재배포 시 신규 키 자동 등록(idempotent).
- get_prompt(key): in-memory 캐시 + version 체크. version 미일치 시 최신 content 재로드. multi-worker 환경에서도 admin 변경이 다음 호출에 반영.
- save_prompt(key, content, user_id): placeholder 필수 토큰 검증 + 버전 bump + history insert.
- reset_prompt(key): DB 값을 PROMPT_DEFAULTS로 되돌림 + 버전 bump.
- rollback(key, version): prompt_versions에서 해당 버전을 가져와 현재로 복원 + 버전 bump.

placeholder 검증: 템플릿이 .format() 으로 사용되는 경우 필수 토큰(예: '{poison_clause_checklist}')이 빠지면
호출 시점에 KeyError로 깨짐. 저장 시점에 사전 검증해서 막는다.
"""
from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass
from typing import Any

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# 시드 레지스트리 — 각 프롬프트의 기본값, 설명, 필수 placeholder
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class PromptDefault:
    content: str
    description: str
    placeholders: tuple[str, ...] = ()


def _load_defaults() -> dict[str, PromptDefault]:
    """코드에 하드코딩된 기존 상수를 import해서 defaults 사전 구성.

    함수로 분리한 이유: prompt 모듈들이 prompt_store를 import할 수 있어 순환 참조 방지.
    """
    from backend.prompts import outline_generation
    from backend.prompts import rfp_analysis
    from backend.prompts import rfp_analysis_general
    from backend.prompts import rfp_section

    return {
        # ISP/ISMP 전용 RFP 분석
        "rfp_analysis.system": PromptDefault(
            content=rfp_analysis.SYSTEM_PROMPT,
            description="ISP/ISMP 공고 분석 — system instruction",
        ),
        "rfp_analysis.poison_checklist": PromptDefault(
            content=rfp_analysis.POISON_CLAUSE_CHECKLIST,
            description="ISP/ISMP 독소조항 체크리스트 (S1-L4 16항목)",
        ),
        "rfp_analysis.template": PromptDefault(
            content=rfp_analysis.ANALYSIS_PROMPT_TEMPLATE,
            description="ISP/ISMP 분석 사용자 프롬프트 템플릿",
            placeholders=("{poison_clause_checklist}", "{rfp_text}"),
        ),
        # 일반 공고용 범용 RFP 분석
        "rfp_analysis_general.system": PromptDefault(
            content=rfp_analysis_general.SYSTEM_PROMPT_GENERAL,
            description="범용 공고 분석 — system instruction (SI 구축·유지관리·연구용역 등)",
        ),
        "rfp_analysis_general.poison_checklist": PromptDefault(
            content=rfp_analysis_general.POISON_CLAUSE_CHECKLIST_GENERAL,
            description="범용 독소조항 체크리스트 (SI/일반 용역 기준)",
        ),
        "rfp_analysis_general.template": PromptDefault(
            content=rfp_analysis_general.ANALYSIS_PROMPT_TEMPLATE_GENERAL,
            description="범용 분석 사용자 프롬프트 템플릿",
            placeholders=("{poison_clause_checklist}", "{rfp_text}"),
        ),
        # 제안목차 생성
        "outline.system": PromptDefault(
            content=outline_generation.OUTLINE_SYSTEM_PROMPT,
            description="제안목차 생성 — system instruction (ISP/ISMP 가이드라인 기반)",
        ),
        "outline.template": PromptDefault(
            content=outline_generation.OUTLINE_PROMPT_TEMPLATE,
            description="제안목차 사용자 프롬프트 템플릿",
            placeholders=(
                "{type_label}", "{guideline}", "{samples}",
                "{project_summary}", "{project_scope}",
                "{eval_criteria}", "{requirements}", "{qualification}",
                "{issuing_org}", "{deadline}", "{project_duration}",
                "{estimated_price}", "{allocated_budget}", "{contract_method}",
            ),
        ),
        # RFP 요구사항 섹션 앵커 추출
        "rfp_section.system": PromptDefault(
            content=rfp_section.SECTION_ANCHOR_SYSTEM_PROMPT,
            description="RFP 요구사항 섹션 앵커 식별 — system instruction",
        ),
        "rfp_section.template": PromptDefault(
            content=rfp_section.SECTION_ANCHOR_USER_TEMPLATE,
            description="앵커 식별 사용자 프롬프트 (요구사항 섹션 boundary 추출)",
            placeholders=("{rfp_text}",),
        ),
    }


# ---------------------------------------------------------------------------
# 캐시 + 동적 로드
# ---------------------------------------------------------------------------


_CACHE: dict[str, tuple[int, str, tuple[str, ...]]] = {}  # key → (version, content, placeholders)
_DEFAULTS_CACHE: dict[str, PromptDefault] | None = None
_LOCK = asyncio.Lock()


def get_defaults() -> dict[str, PromptDefault]:
    global _DEFAULTS_CACHE
    if _DEFAULTS_CACHE is None:
        _DEFAULTS_CACHE = _load_defaults()
    return _DEFAULTS_CACHE


async def seed_prompts(db: AsyncSession) -> None:
    """defaults 사전을 DB에 INSERT (없을 때만). 코드에 새 키 추가 시 자동 반영."""
    defaults = get_defaults()
    for key, d in defaults.items():
        await db.execute(
            text("""
                INSERT INTO prompts (key, content, description, placeholders, version)
                     VALUES (:key, :content, :description, :placeholders, 1)
                ON CONFLICT (key) DO NOTHING
            """),
            {
                "key": key,
                "content": d.content,
                "description": d.description,
                "placeholders": list(d.placeholders),
            },
        )
    await db.commit()


async def get_prompt(key: str, db: AsyncSession) -> str:
    """key로 프롬프트 content 조회. version 체크로 multi-worker invalidation 보장.

    캐시 hit: 1 row SELECT(version만) — 빠름.
    캐시 miss 또는 version 변경: 전체 row SELECT.
    """
    # 1차: 캐시된 version과 비교
    cached = _CACHE.get(key)
    if cached:
        cached_version = cached[0]
        row = (await db.execute(
            text("SELECT version FROM prompts WHERE key = :key"),
            {"key": key},
        )).first()
        if row and row[0] == cached_version:
            return cached[1]

    # 2차: 캐시 미스 또는 version 변경 — 본문 재로드
    async with _LOCK:
        row = (await db.execute(
            text("SELECT version, content, placeholders FROM prompts WHERE key = :key"),
            {"key": key},
        )).first()
        if not row:
            # 시드 누락 — defaults에서 즉시 채움
            default = get_defaults().get(key)
            if not default:
                raise KeyError(f"알 수 없는 프롬프트 키: {key}")
            await db.execute(
                text("""
                    INSERT INTO prompts (key, content, description, placeholders, version)
                         VALUES (:key, :content, :description, :placeholders, 1)
                    ON CONFLICT (key) DO NOTHING
                """),
                {
                    "key": key,
                    "content": default.content,
                    "description": default.description,
                    "placeholders": list(default.placeholders),
                },
            )
            await db.commit()
            content = default.content
            version = 1
            placeholders = default.placeholders
        else:
            version, content, ph = row
            placeholders = tuple(ph or ())
        _CACHE[key] = (version, content, placeholders)
        return content


# ---------------------------------------------------------------------------
# 변경 API
# ---------------------------------------------------------------------------


def validate_placeholders(content: str, required: tuple[str, ...]) -> list[str]:
    """필수 placeholder가 content에 모두 등장하는지 검사. 누락된 토큰 리스트 반환."""
    return [p for p in required if p not in content]


async def save_prompt(key: str, content: str, user_id: int | None, db: AsyncSession) -> dict[str, Any]:
    """프롬프트 갱신. 필수 placeholder 검증 → 버전 bump → history insert.

    Raises:
        KeyError: 모르는 키
        ValueError: placeholder 누락
    """
    defaults = get_defaults()
    if key not in defaults:
        raise KeyError(f"알 수 없는 프롬프트 키: {key}")
    required = defaults[key].placeholders
    missing = validate_placeholders(content, required)
    if missing:
        raise ValueError(f"필수 placeholder 누락: {missing}")

    async with _LOCK:
        row = (await db.execute(
            text("SELECT version FROM prompts WHERE key = :key"),
            {"key": key},
        )).first()
        cur_version = row[0] if row else 0
        new_version = cur_version + 1

        # 기존 row가 있으면 history에 백업 후 갱신, 없으면 신규 + 히스토리 v1
        if row:
            # 기존 content를 history로 백업
            existing = (await db.execute(
                text("SELECT content FROM prompts WHERE key = :key"),
                {"key": key},
            )).first()
            if existing:
                await db.execute(
                    text("""
                        INSERT INTO prompt_versions (key, version, content, saved_by)
                             VALUES (:key, :version, :content, :user_id)
                        ON CONFLICT (key, version) DO NOTHING
                    """),
                    {
                        "key": key,
                        "version": cur_version,
                        "content": existing[0],
                        "user_id": user_id,
                    },
                )
            await db.execute(
                text("""
                    UPDATE prompts
                       SET content = :content,
                           version = :version,
                           updated_at = NOW(),
                           updated_by = :user_id
                     WHERE key = :key
                """),
                {"key": key, "content": content, "version": new_version, "user_id": user_id},
            )
        else:
            default = defaults[key]
            await db.execute(
                text("""
                    INSERT INTO prompts (key, content, description, placeholders, version, updated_by)
                         VALUES (:key, :content, :description, :placeholders, :version, :user_id)
                """),
                {
                    "key": key,
                    "content": content,
                    "description": default.description,
                    "placeholders": list(default.placeholders),
                    "version": new_version,
                    "user_id": user_id,
                },
            )
        await db.commit()
        _CACHE[key] = (new_version, content, required)
    return {"key": key, "version": new_version}


async def reset_prompt(key: str, user_id: int | None, db: AsyncSession) -> dict[str, Any]:
    """defaults 값으로 복원 (변경 이력으로 기록)."""
    defaults = get_defaults()
    if key not in defaults:
        raise KeyError(f"알 수 없는 프롬프트 키: {key}")
    return await save_prompt(key, defaults[key].content, user_id, db)


async def rollback_prompt(key: str, target_version: int, user_id: int | None, db: AsyncSession) -> dict[str, Any]:
    """이전 버전의 content를 현재로 복원 (변경 이력으로 기록)."""
    row = (await db.execute(
        text("SELECT content FROM prompt_versions WHERE key = :key AND version = :v"),
        {"key": key, "v": target_version},
    )).first()
    if not row:
        raise KeyError(f"버전을 찾을 수 없습니다: {key}@v{target_version}")
    return await save_prompt(key, row[0], user_id, db)


# ---------------------------------------------------------------------------
# 조회 API (admin 전용)
# ---------------------------------------------------------------------------


async def list_prompts(db: AsyncSession) -> list[dict[str, Any]]:
    rows = (await db.execute(
        text("""
            SELECT key, description, placeholders, version, updated_at, updated_by
              FROM prompts
             ORDER BY key
        """)
    )).all()
    return [
        {
            "key": r[0],
            "description": r[1],
            "placeholders": list(r[2] or []),
            "version": r[3],
            "updated_at": r[4].isoformat() if r[4] else None,
            "updated_by": r[5],
        }
        for r in rows
    ]


async def get_prompt_detail(key: str, db: AsyncSession) -> dict[str, Any] | None:
    row = (await db.execute(
        text("""
            SELECT content, description, placeholders, version, updated_at, updated_by
              FROM prompts WHERE key = :key
        """),
        {"key": key},
    )).first()
    if not row:
        return None
    defaults = get_defaults()
    default_content = defaults[key].content if key in defaults else None
    return {
        "key": key,
        "content": row[0],
        "description": row[1],
        "placeholders": list(row[2] or []),
        "version": row[3],
        "updated_at": row[4].isoformat() if row[4] else None,
        "updated_by": row[5],
        "default_content": default_content,
    }


async def get_prompt_history(key: str, db: AsyncSession) -> list[dict[str, Any]]:
    rows = (await db.execute(
        text("""
            SELECT version, content, saved_at, saved_by
              FROM prompt_versions
             WHERE key = :key
             ORDER BY version DESC
        """),
        {"key": key},
    )).all()
    return [
        {
            "version": r[0],
            "content": r[1],
            "saved_at": r[2].isoformat() if r[2] else None,
            "saved_by": r[3],
        }
        for r in rows
    ]
