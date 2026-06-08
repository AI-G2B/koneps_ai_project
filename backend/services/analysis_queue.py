"""자동 AI 분석 큐.

공고 수집 직후 신규 Notice 들에 대해 비동기로 AI 분석을 실행한다.

설계 포인트:
- asyncio.Semaphore로 동시 분석 수 제한 (Gemini RPM/TPM·LibreAI 일 한도 보호)
- 전역 backoff: 429/503 한 번 발생 시 전체 큐가 N초 일시 정지 (thundering herd 방지)
- 일일 자동 분석 한도: 잘못된 수집(과대 결과)이 비용 폭주를 일으키는 걸 방지
- 중복 enqueue 방지: 이미 처리 중인 notice_id는 다시 큐에 들어가지 않음
- 사전 필터: notice_type / is_rfp 첨부 유무 / pipeline_status 검사로 LLM 호출 자체를 건너뜀

환경변수:
    ANALYSIS_CONCURRENCY  : 동시 분석 슬롯 (기본 10)
    AUTO_ANALYSIS_DAILY_CAP: 일일 자동 분석 상한 (기본 200)
    ANALYSIS_BACKOFF_SEC  : 429/503 시 전역 일시 정지 시간 (기본 60)
"""
from __future__ import annotations

import asyncio
import logging
import os
import time as _time
from datetime import date

from sqlalchemy import func, select

from backend.db.crud import update_pipeline_status
from backend.db.database import AsyncSessionLocal
from backend.db.models import Attachment, Notice
from backend.services import progress_store
from backend.services.analysis_service import analyze_rfp

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# 설정값
# ---------------------------------------------------------------------------


def _env_int(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, str(default)))
    except (ValueError, TypeError):
        return default


CONCURRENCY = _env_int("ANALYSIS_CONCURRENCY", 10)
DAILY_CAP = _env_int("AUTO_ANALYSIS_DAILY_CAP", 200)
BACKOFF_SEC = _env_int("ANALYSIS_BACKOFF_SEC", 60)

# 분석 대상 ntce_kind_nm 블랙리스트 — 정정/취소 류는 분석 대상에서 제외.
# 화이트리스트 대신 블랙리스트로 둬서 모르는 새 분류값이 등장해도 분석은 진행되게.
SKIP_NTCE_KIND = {"정정공고", "취소공고", "재입찰공고"}


# ---------------------------------------------------------------------------
# 인메모리 상태
# ---------------------------------------------------------------------------


_SEM: asyncio.Semaphore | None = None  # lazy 초기화 (event loop 바인딩)
_BACKOFF_UNTIL: float = 0.0
_ACTIVE: set[int] = set()
_DAILY_COUNT: dict[date, int] = {}


def _get_semaphore() -> asyncio.Semaphore:
    global _SEM
    if _SEM is None:
        _SEM = asyncio.Semaphore(CONCURRENCY)
    return _SEM


def _set_backoff(seconds: int) -> None:
    global _BACKOFF_UNTIL
    _BACKOFF_UNTIL = max(_BACKOFF_UNTIL, _time.monotonic() + seconds)


def _quota_remaining() -> int:
    today = date.today()
    return max(0, DAILY_CAP - _DAILY_COUNT.get(today, 0))


def _quota_increment() -> None:
    today = date.today()
    _DAILY_COUNT[today] = _DAILY_COUNT.get(today, 0) + 1


# ---------------------------------------------------------------------------
# 사전 필터
# ---------------------------------------------------------------------------


async def _is_eligible(notice_id: int) -> tuple[bool, str]:
    """분석 대상 여부 + 이유 반환. False면 LLM 호출 안 하고 collected 상태 유지."""
    async with AsyncSessionLocal() as db:
        notice = (await db.execute(
            select(Notice).where(Notice.id == notice_id)
        )).scalar_one_or_none()
        if notice is None:
            return False, "notice 없음"
        if notice.ntce_kind_nm in SKIP_NTCE_KIND:
            return False, f"ntce_kind_nm={notice.ntce_kind_nm} (분석 대상 아님)"
        if notice.pipeline_status in ("analyzing", "analyzed"):
            return False, f"이미 처리됨 (status={notice.pipeline_status})"

        rfp_count = (await db.execute(
            select(func.count(Attachment.id)).where(
                Attachment.notice_id == notice_id,
                Attachment.is_rfp.is_(True),
            )
        )).scalar_one()
        if not rfp_count:
            return False, "is_rfp 첨부 없음"
    return True, "ok"


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def enqueue_auto_analysis(notice_ids: list[int]) -> int:
    """신규 Notice id 리스트를 자동 분석 큐에 등록.

    실제 실행은 백그라운드 asyncio.create_task로 fire-and-forget.
    Semaphore가 동시 실행 수를 제한하므로 ids가 많아도 안전.

    Returns:
        실제로 큐에 들어간 건수 (중복/한도 초과로 skip된 건은 제외).
    """
    if not notice_ids:
        return 0
    queued = 0
    for nid in notice_ids:
        if nid in _ACTIVE:
            continue
        if _quota_remaining() <= 0:
            logger.warning(f"[자동분석] 일일 한도 도달 ({DAILY_CAP}) — notice_id={nid} skip")
            break
        _ACTIVE.add(nid)
        asyncio.create_task(_run_one(nid))
        queued += 1
    if queued:
        logger.info(f"[자동분석] 큐 {queued}건 enqueue (전체 ids={len(notice_ids)})")
    return queued


async def _run_one(notice_id: int) -> None:
    """단일 공고 분석. _ACTIVE에서 항상 해제됨을 보장."""
    try:
        eligible, reason = await _is_eligible(notice_id)
        if not eligible:
            logger.info(f"[자동분석] skip notice_id={notice_id}: {reason}")
            # skip은 분석 실패의 한 종류 — pipeline_status='failed' + parse_error_msg에 사유 저장.
            # 사용자가 상세 페이지에서 사유를 확인하고 필요 시 강제 재실행할 수 있다.
            async with AsyncSessionLocal() as db:
                try:
                    await update_pipeline_status(db, notice_id, "failed", f"자동 분석 제외: {reason}")
                except Exception as e:  # noqa: BLE001
                    logger.warning(f"[자동분석] skip 상태 기록 실패 (notice_id={notice_id}): {e}")
            return

        # 전역 backoff 대기
        now = _time.monotonic()
        if _BACKOFF_UNTIL > now:
            wait = _BACKOFF_UNTIL - now
            logger.info(f"[자동분석] backoff 대기 {wait:.1f}초 (notice_id={notice_id})")
            await asyncio.sleep(wait)

        sem = _get_semaphore()
        async with sem:
            # 한도 재확인 (대기 중 한도 도달했을 수 있음)
            if _quota_remaining() <= 0:
                logger.warning(f"[자동분석] 한도 도달 — notice_id={notice_id} skip")
                return

            async with AsyncSessionLocal() as db:
                try:
                    await update_pipeline_status(db, notice_id, "analyzing")
                    progress_store.clear(notice_id)
                    progress_store.emit(notice_id, "자동 AI 분석 시작")
                    await analyze_rfp(notice_id, db)
                    await update_pipeline_status(db, notice_id, "analyzed")
                    _quota_increment()
                    progress_store.emit(notice_id, "자동 AI 분석 완료", level="success")
                except Exception as e:  # noqa: BLE001
                    msg = str(e)
                    if "429" in msg or "503" in msg or "RESOURCE_EXHAUSTED" in msg:
                        _set_backoff(BACKOFF_SEC)
                        logger.warning(
                            f"[자동분석] rate-limit 감지 → backoff {BACKOFF_SEC}초 설정 (notice_id={notice_id})"
                        )
                        await update_pipeline_status(db, notice_id, "collected", "rate-limit, 재시도 대기")
                    else:
                        await update_pipeline_status(db, notice_id, "failed", msg[:200])
                        logger.error(
                            f"[자동분석] 실패 (notice_id={notice_id}): {e}",
                            exc_info=True,
                        )
    finally:
        _ACTIVE.discard(notice_id)
