"""
공고 수집·조회 엔드포인트
담당: 최서원

GET  /bids/collect/preview → DB 저장 없이 수집 미리보기
POST /bids/collect         → 공고 수집 후 DB 저장
GET  /bids                 → 저장된 공고 목록 (미구현)
GET  /bids/{bid_ntce_no}   → 공고 상세 (미구현)
"""

from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from backend.collector.file_downloader import download_attachments
from backend.collector.naramarket import _classify_notice_type, fetch_bids
from backend.db.crud import create_notice, get_notice_by_bid_no
from backend.db.database import get_db
from backend.db.models import Notice

router = APIRouter()


# ──────────────────────────────────────
# Pydantic 스키마
# ──────────────────────────────────────


class AttachmentSchema(BaseModel):
    """첨부파일 단건 스키마"""
    file_name: str
    file_url: str
    file_type: str


class BidPreviewItem(BaseModel):
    """공고 미리보기 단건 스키마"""
    bid_ntce_no: str
    bid_ntce_nm: str
    ntce_instt_nm: str
    bid_clse_dt: str
    ntce_kind_nm: str
    presmpt_prce: str | None
    category_large: str
    category_detail: str
    attachments: list[AttachmentSchema]


class BidPreviewResponse(BaseModel):
    """공고 미리보기 응답 스키마"""
    count: int
    bids: list[BidPreviewItem]


class CollectResponse(BaseModel):
    """공고 수집 결과 응답 스키마"""
    saved: int    # DB에 새로 저장된 공고 수
    skipped: int  # 중복으로 건너뛴 공고 수
    errors: int   # 저장 실패한 공고 수


# ──────────────────────────────────────
# 헬퍼 함수
# ──────────────────────────────────────


def _format_price(won: int | None) -> str | None:
    """원 단위 금액을 억원·만원 한국어 표기로 변환한다."""
    if not won:
        return None
    eok = won // 100000000
    man = (won % 100000000) // 10000
    if eok and man:
        return f"{eok}억 {man:,}만원"
    if eok:
        return f"{eok}억원"
    return f"{man:,}만원"


# ──────────────────────────────────────
# 엔드포인트
# ──────────────────────────────────────


@router.get("/collect/preview", summary="수집 미리보기 (DB 저장 안 함)", response_model=BidPreviewResponse)
def preview_collect(
    start_date: str | None = None,
    end_date: str | None = None,
    it_only: bool = True,
) -> BidPreviewResponse:
    """오늘 날짜 기준으로 나라장터 공고를 수집하여 미리보기 결과를 반환한다."""
    today = date.today().strftime("%Y%m%d")
    start = start_date or today
    end = end_date or today

    try:
        results = fetch_bids(start, end, it_only)
    except (ValueError, RuntimeError) as e:
        raise HTTPException(status_code=502, detail=str(e))

    bids = [
        BidPreviewItem(
            bid_ntce_no=r["bid"]["bid_ntce_no"],
            bid_ntce_nm=r["bid"]["bid_ntce_nm"],
            ntce_instt_nm=r["bid"]["ntce_instt_nm"],
            bid_clse_dt=r["bid"]["bid_clse_dt"],
            ntce_kind_nm=r["bid"]["ntce_kind_nm"],
            presmpt_prce=_format_price(r["bid"]["presmpt_prce"]),
            category_large=r["bid"]["pub_prcrmnt_lrg_clsfc_nm"],
            category_detail=r["bid"]["pub_prcrmnt_clsfc_nm"],
            attachments=[
                AttachmentSchema(
                    file_name=a["file_name"],
                    file_url=a["file_url"],
                    file_type=a["file_type"],
                )
                for a in r["attachments"]
            ],
        )
        for r in results
    ]

    return BidPreviewResponse(count=len(bids), bids=bids)
