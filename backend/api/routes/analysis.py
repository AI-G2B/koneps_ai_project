"""
AI 분석 트리거 엔드포인트
담당: 강현묵 (AI 분석 로직), 최서원 (엔드포인트 구조)

POST /analysis/run/{notice_id}  → AI 분석 실행 (pipeline_status 관리)
GET  /analysis/{notice_id}      → 분석 결과 조회
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from backend.db.crud import (
    get_analysis_by_notice_id,
    get_notice_detail,
    update_pipeline_status,
)
from backend.db.database import get_db

router = APIRouter()


class AnalysisRunResponse(BaseModel):
    """분석 트리거 응답 스키마"""
    bid_ntce_no: str
    pipeline_status: str
    message: str


@router.post(
    "/run/{bid_ntce_no}",
    summary="AI 분석 실행",
    response_model=AnalysisRunResponse,
)
async def run_analysis(
    bid_ntce_no: str,
    db: AsyncSession = Depends(get_db),
) -> AnalysisRunResponse:
    """공고번호를 받아 AI 분석 파이프라인을 실행한다.

    1. pipeline_status → 'analyzing'
    2. AI 분석 실행 (강현묵 구현 예정)
    3. pipeline_status → 'analyzed' 또는 'failed'
    """
    notice = await get_notice_detail(db, bid_ntce_no)
    if not notice:
        raise HTTPException(status_code=404, detail="공고를 찾을 수 없습니다.")

    if notice.pipeline_status == "analyzing":
        raise HTTPException(status_code=409, detail="이미 분석이 진행 중입니다.")

    await update_pipeline_status(db, notice.id, "analyzing")

    try:
        # TODO: 강현묵 — 아래 세 줄 주석 해제 후 raise NotImplementedError 삭제
        # from backend.agents.orchestrator import run_pipeline
        # await run_pipeline(notice.id, db)
        # await update_pipeline_status(db, notice.id, "analyzed")
        # return AnalysisRunResponse(bid_ntce_no=bid_ntce_no, pipeline_status="analyzed", message="AI 분석이 완료되었습니다.")
        raise NotImplementedError("AI 분석 함수 미구현 (강현묵 담당)")
    except NotImplementedError:
        await update_pipeline_status(db, notice.id, "collected")
        raise HTTPException(status_code=501, detail="AI 분석 함수가 아직 구현되지 않았습니다.")
    except Exception as e:
        await update_pipeline_status(db, notice.id, "failed", str(e))
        raise HTTPException(status_code=500, detail=f"분석 실패: {e}")


@router.get(
    "/{bid_ntce_no}",
    summary="분석 결과 조회",
)
async def get_analysis(
    bid_ntce_no: str,
    db: AsyncSession = Depends(get_db),
):
    """공고번호로 AI 분석 결과와 위험 요인을 반환한다."""
    notice = await get_notice_detail(db, bid_ntce_no)
    if not notice:
        raise HTTPException(status_code=404, detail="공고를 찾을 수 없습니다.")

    analysis = await get_analysis_by_notice_id(db, notice.id)

    return {
        "bid_ntce_no": bid_ntce_no,
        "pipeline_status": notice.pipeline_status,
        "analysis_result": analysis,
    }

