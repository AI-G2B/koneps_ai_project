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

from backend.collector.naramarket import fetch_bids
from backend.collector.service import collect_and_save
from backend.db.crud import get_attachments_by_notice, get_dashboard_stats, get_notice_detail, get_notices, get_type_stats
from backend.db.database import get_db

router = APIRouter()


# ──────────────────────────────────────
# Pydantic 스키마
# ──────────────────────────────────────


class AttachmentSchema(BaseModel):
    """첨부파일 단건 스키마"""
    id: int
    file_name: str
    file_url: str
    file_type: str
    local_path: str | None
    parse_status: str

    class Config:
        from_attributes = True


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


class TypeStatItem(BaseModel):
    """유형별 통계 단건 스키마"""
    type: str
    count: int
    ratio: float


class DashboardStatsResponse(BaseModel):
    """대시보드 상단 통계 카드 응답 스키마"""
    today_new: int       # 오늘 신규 공고
    deadline_soon: int   # 마감 임박 (3일 이내)
    analysis_done: int   # AI 분석 완료 (이번 달)
    proposal_count: int  # 제안 공고 수


class BidListItem(BaseModel):
    """공고 목록 단건 스키마"""
    id: int
    bid_ntce_no: str
    bid_ntce_nm: str
    ntce_instt_nm: str | None
    ntce_kind_nm: str | None
    is_isp_ismp: bool
    isp_ismp_type: str | None
    presmpt_prce: float | None
    bid_clse_dt: datetime | None
    pipeline_status: str

    class Config:
        from_attributes = True


class BidListResponse(BaseModel):
    """공고 목록 응답 스키마"""
    total: int
    bids: list[BidListItem]


class BidDetailResponse(BaseModel):
    """공고 상세 응답 스키마"""
    id: int
    bid_ntce_no: str
    bid_ntce_ord: str
    notice_type: str
    bid_ntce_nm: str
    ntce_instt_nm: str | None
    dminstt_nm: str | None
    bid_mtd_nm: str | None
    cntrct_cncls_mthd_nm: str | None
    ntce_kind_nm: str | None
    is_isp_ismp: bool
    isp_ismp_type: str | None
    asign_bdgt_amt: float | None
    presmpt_prce: float | None
    bid_clse_dt: datetime | None
    bid_ntce_dt: datetime | None
    openg_dt: datetime | None
    bid_ntce_dtl_url: str | None
    pipeline_status: str
    collected_at: datetime | None
    attachments: list[AttachmentSchema] = []

    class Config:
        from_attributes = True


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


@router.get("/stats", summary="대시보드 통계 카드", response_model=DashboardStatsResponse)
async def dashboard_stats(
    db: AsyncSession = Depends(get_db),
) -> DashboardStatsResponse:
    """대시보드 상단 통계 카드 4개 데이터를 반환한다."""
    stats = await get_dashboard_stats(db)
    return DashboardStatsResponse(**stats)


@router.get("/type-stats", summary="공고 유형별 통계 (도넛 차트)", response_model=list[TypeStatItem])
async def type_stats(
    db: AsyncSession = Depends(get_db),
) -> list[TypeStatItem]:
    """ISP/ISMP/기타 유형별 건수와 비율을 반환한다."""
    stats = await get_type_stats(db)
    return [TypeStatItem(**s) for s in stats]


@router.get("", summary="저장된 공고 목록 조회", response_model=BidListResponse)
async def list_bids(
    limit: int = 20,
    offset: int = 0,
    isp_ismp_only: bool = False,
    ntce_kind: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    db: AsyncSession = Depends(get_db),
) -> BidListResponse:
    """DB에 저장된 공고 목록을 입찰마감일 오름차순으로 반환한다."""
    # date_from, date_to는 YYYY-MM-DD 형식으로 받아 datetime으로 변환
    dt_from = datetime.strptime(date_from, "%Y-%m-%d").replace(tzinfo=timezone.utc) if date_from else None
    dt_to = datetime.strptime(date_to, "%Y-%m-%d").replace(hour=23, minute=59, second=59, tzinfo=timezone.utc) if date_to else None

    notices = await get_notices(db, limit=limit, offset=offset, isp_ismp_only=isp_ismp_only, ntce_kind=ntce_kind, date_from=dt_from, date_to=dt_to)
    return BidListResponse(
        total=len(notices),
        bids=[BidListItem.model_validate(n) for n in notices],
    )


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


@router.post("/collect", summary="공고 수집 후 DB 저장", response_model=CollectResponse)
async def collect_bids(
    start_date: str | None = None,
    end_date: str | None = None,
    it_only: bool = True,
    download: bool = False,
    db: AsyncSession = Depends(get_db),
) -> CollectResponse:
    """나라장터 공고를 수집하여 DB에 저장한다. 중복 공고는 건너뛴다."""
    today = date.today().strftime("%Y%m%d")
    start = start_date or today
    end = end_date or today

    try:
        result = await collect_and_save(db, start, end, it_only=it_only, download=download)
    except (ValueError, RuntimeError) as e:
        raise HTTPException(status_code=502, detail=str(e))

    return CollectResponse(**result)


@router.get("/{bid_ntce_no}", summary="공고 상세 조회", response_model=BidDetailResponse)
async def get_bid_detail(
    bid_ntce_no: str,
    db: AsyncSession = Depends(get_db),
) -> BidDetailResponse:
    """공고번호로 공고 상세 정보를 반환한다. 재공고가 있으면 최신 차수를 반환한다."""
    notice = await get_notice_detail(db, bid_ntce_no)
    if not notice:
        raise HTTPException(status_code=404, detail="공고를 찾을 수 없습니다.")
    attachments = await get_attachments_by_notice(db, notice.id)
    response = BidDetailResponse.model_validate(notice)
    response.attachments = [AttachmentSchema.model_validate(a) for a in attachments]
    return response
