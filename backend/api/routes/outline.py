"""제안목차 생성 라우트.

POST /outline/run/{bid_ntce_no}    → 백그라운드로 generate_outline 실행
GET  /outline/{bid_ntce_no}        → sections(JSONB) + 메타 조회
GET  /outline/{bid_ntce_no}/excel  → Excel 파일 다운로드
GET  /outline/{bid_ntce_no}/status → progress_store 누적 로그 (폴링용)
"""
import logging
from urllib.parse import quote

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.db.crud import get_notice_detail
from backend.db.database import AsyncSessionLocal, get_db
from backend.db.models import ProposalOutline
from backend.services import progress_store
from backend.services.outline_service import (
    UnsupportedProjectTypeError,
    build_outline_xlsx,
    generate_outline,
)

router = APIRouter()
logger = logging.getLogger(__name__)


class OutlineRunResponse(BaseModel):
    bid_ntce_no: str
    message: str


async def _run_outline_task(notice_id: int) -> None:
    """백그라운드 제안목차 생성. 요청 세션이 닫힌 뒤 실행되므로 자체 세션 생성."""
    async with AsyncSessionLocal() as db:
        try:
            await generate_outline(notice_id, db)
        except UnsupportedProjectTypeError:
            # progress_store에 이미 사용자 메시지 emit됨
            pass
        except Exception as e:  # noqa: BLE001
            progress_store.emit(notice_id, f"제안목차 생성 실패: {str(e)[:120]}", level="error")
            logger.error(f"제안목차 생성 실패 (notice_id={notice_id}): {e}", exc_info=True)


@router.post(
    "/run/{bid_ntce_no}",
    summary="제안목차 생성",
    response_model=OutlineRunResponse,
)
async def run_outline(
    bid_ntce_no: str,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
) -> OutlineRunResponse:
    notice = await get_notice_detail(db, bid_ntce_no)
    if not notice:
        raise HTTPException(status_code=404, detail="공고를 찾을 수 없습니다.")

    progress_store.clear(notice.id)
    progress_store.emit(notice.id, "제안목차 생성 요청 접수")
    background_tasks.add_task(_run_outline_task, notice.id)
    return OutlineRunResponse(
        bid_ntce_no=bid_ntce_no,
        message="제안목차 생성을 시작합니다.",
    )


@router.get(
    "/{bid_ntce_no}/status",
    summary="제안목차 생성 진행 상태 + 실시간 로그",
)
async def get_outline_status(
    bid_ntce_no: str,
    db: AsyncSession = Depends(get_db),
):
    notice = await get_notice_detail(db, bid_ntce_no)
    if not notice:
        raise HTTPException(status_code=404, detail="공고를 찾을 수 없습니다.")
    outline_exists = (await db.execute(
        select(ProposalOutline.id).where(
            ProposalOutline.notice_id == notice.id,
            ProposalOutline.is_active.is_(True),
        )
    )).scalar_one_or_none() is not None
    return {
        "bid_ntce_no": bid_ntce_no,
        "exists": outline_exists,
        "logs": progress_store.get(notice.id),
    }


@router.get(
    "/{bid_ntce_no}/excel",
    summary="제안목차 Excel 다운로드",
)
async def download_outline_excel(
    bid_ntce_no: str,
    db: AsyncSession = Depends(get_db),
):
    notice = await get_notice_detail(db, bid_ntce_no)
    if not notice:
        raise HTTPException(status_code=404, detail="공고를 찾을 수 없습니다.")
    outline = (await db.execute(
        select(ProposalOutline).where(
            ProposalOutline.notice_id == notice.id,
            ProposalOutline.is_active.is_(True),
        )
    )).scalar_one_or_none()
    if not outline:
        raise HTTPException(status_code=404, detail="생성된 제안목차가 없습니다.")

    outline_payload = dict(outline.sections or {})
    if outline.rfp_raw_text:
        outline_payload["rfp_raw_text"] = outline.rfp_raw_text
    xlsx_bytes = build_outline_xlsx(outline_payload)
    filename = f"(제안목차) {notice.bid_ntce_nm}.xlsx"
    encoded = quote(filename, safe="")
    return StreamingResponse(
        iter([xlsx_bytes]),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f"attachment; filename*=UTF-8''{encoded}",
            "Content-Length": str(len(xlsx_bytes)),
        },
    )


@router.get(
    "/{bid_ntce_no}",
    summary="제안목차 조회 (sections JSONB + 메타)",
)
async def get_outline(
    bid_ntce_no: str,
    db: AsyncSession = Depends(get_db),
):
    notice = await get_notice_detail(db, bid_ntce_no)
    if not notice:
        raise HTTPException(status_code=404, detail="공고를 찾을 수 없습니다.")
    outline = (await db.execute(
        select(ProposalOutline).where(
            ProposalOutline.notice_id == notice.id,
            ProposalOutline.is_active.is_(True),
        )
    )).scalar_one_or_none()
    if not outline:
        raise HTTPException(status_code=404, detail="생성된 제안목차가 없습니다.")
    return {
        "bid_ntce_no": bid_ntce_no,
        "sections": outline.sections,
        "rfp_raw_text": outline.rfp_raw_text,
        "guideline_base": outline.guideline_base,
        "model_used": outline.model_used,
        "generated_at": outline.generated_at,
        "outline_version": outline.outline_version,
    }
