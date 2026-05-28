"""
AI 분석 트리거 엔드포인트
담당: 강현묵 (AI 분석 로직), 최서원 (엔드포인트 구조)

POST /analysis/run/{bid_ntce_no}  → AI 분석 실행 (백그라운드)
GET  /analysis/{bid_ntce_no}      → 분석 결과 조회
"""

import logging

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from backend.db.crud import (
    get_analysis_by_notice_id,
    get_notice_detail,
    update_pipeline_status,
)
from backend.db.database import AsyncSessionLocal, get_db
from backend.services import progress_store
from backend.services.analysis_service import analyze_rfp

router = APIRouter()
logger = logging.getLogger(__name__)


class AnalysisRunResponse(BaseModel):
    """분석 트리거 응답 스키마"""
    bid_ntce_no: str
    pipeline_status: str
    message: str


async def _run_analysis_task(notice_id: int) -> None:
    """백그라운드 분석 작업.

    요청 세션은 응답 직후 닫히므로 BackgroundTask는 자체 세션을 생성한다.
    """
    async with AsyncSessionLocal() as db:
        try:
            await analyze_rfp(notice_id, db)
            await update_pipeline_status(db, notice_id, "analyzed")
        except Exception as e:  # noqa: BLE001
            await update_pipeline_status(db, notice_id, "failed", str(e))
            logger.error(f"AI 분석 실패 (notice_id={notice_id}): {e}", exc_info=True)


@router.post(
    "/run/{bid_ntce_no}",
    summary="AI 분석 실행",
    response_model=AnalysisRunResponse,
)
async def run_analysis(
    bid_ntce_no: str,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
) -> AnalysisRunResponse:
    """공고번호를 받아 AI 분석 파이프라인을 백그라운드로 실행한다."""
    notice = await get_notice_detail(db, bid_ntce_no)
    if not notice:
        raise HTTPException(status_code=404, detail="공고를 찾을 수 없습니다.")

    if notice.pipeline_status == "analyzing":
        raise HTTPException(status_code=409, detail="이미 분석이 진행 중입니다.")

    await update_pipeline_status(db, notice.id, "analyzing")
    progress_store.clear(notice.id)
    progress_store.emit(notice.id, "AI 분석 요청 접수")
    background_tasks.add_task(_run_analysis_task, notice.id)

    return AnalysisRunResponse(
        bid_ntce_no=bid_ntce_no,
        pipeline_status="analyzing",
        message="AI 분석을 시작합니다.",
    )


@router.get(
    "/{bid_ntce_no}/status",
    summary="AI 분석 진행 상태 + 실시간 로그",
)
async def get_analysis_status(
    bid_ntce_no: str,
    db: AsyncSession = Depends(get_db),
):
    """분석 진행 중인 공고의 pipeline_status와 progress_store의 누적 로그를 반환한다.

    프론트가 폴링하여 분석 중 실시간 로그를 흐름으로 표시할 수 있다.
    """
    notice = await get_notice_detail(db, bid_ntce_no)
    if not notice:
        raise HTTPException(status_code=404, detail="공고를 찾을 수 없습니다.")
    return {
        "bid_ntce_no": bid_ntce_no,
        "pipeline_status": notice.pipeline_status,
        "logs": progress_store.get(notice.id),
    }


@router.get(
    "/{bid_ntce_no}",
    summary="분석 결과 조회",
)
async def get_analysis(
    bid_ntce_no: str,
    db: AsyncSession = Depends(get_db),
):
    """공고번호로 AI 분석 결과를 반환한다. 독소조항은 analysis_result.poison_clauses에 포함."""
    notice = await get_notice_detail(db, bid_ntce_no)
    if not notice:
        raise HTTPException(status_code=404, detail="공고를 찾을 수 없습니다.")

    analysis = await get_analysis_by_notice_id(db, notice.id)

    return {
        "bid_ntce_no": bid_ntce_no,
        "pipeline_status": notice.pipeline_status,
        "analysis_result": analysis,
    }
