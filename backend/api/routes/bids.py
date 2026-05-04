"""
공고 수집·조회 엔드포인트
담당: 최서원

GET  /bids                 → 저장된 공고 목록 (페이지네이션, 날짜·유형·마감여부 필터)
GET  /bids/stats           → 대시보드 KPI 통계 카드
GET  /bids/type-stats      → 공고 유형별 통계 (도넛 차트)
GET  /bids/collect/preview → DB 저장 없이 수집 미리보기
POST /bids/collect         → 공고 수집 후 DB 저장
GET  /bids/{bid_ntce_no}   → 공고 상세 (첨부파일 포함)

pipeline_status 값:
  collected  → 수집 완료 (기본값)
  parsing    → 문서 파싱 중
  analyzed   → AI 분석 완료
  failed     → 파이프라인 오류
"""

from datetime import date, datetime, timedelta, timezone

KST = timezone(timedelta(hours=9))

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from backend.collector.naramarket import fetch_bids, fetch_bids_by_query
from backend.collector.naramarket import _classify_notice_type
from backend.collector.service import collect_and_save
from backend.db.crud import (
    count_notices,
    get_attachments_by_notice,
    get_dashboard_stats,
    get_notice_detail,
    get_notice_by_bid_no,
    get_notices,
    get_type_stats,
    search_notices,
    set_bookmark,
    set_in_progress,
)
from backend.db.models import Notice
from backend.db.database import get_db

router = APIRouter()


# ──────────────────────────────────────
# Pydantic 스키마
# ──────────────────────────────────────


class AttachmentSchema(BaseModel):
    """첨부파일 단건 스키마. preview 응답에서는 id=None."""

    id: int | None = None
    file_name: str
    file_url: str
    file_type: str
    local_path: str | None = None
    parse_status: str = "pending"

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

    saved: int  # DB에 새로 저장된 공고 수
    skipped: int  # 중복으로 건너뛴 공고 수
    errors: int  # 저장 실패한 공고 수


class TypeStatItem(BaseModel):
    """유형별 통계 단건 스키마"""

    type: str
    count: int
    ratio: float


class DashboardStatsResponse(BaseModel):
    """대시보드 상단 통계 카드 응답 스키마"""

    today_new: int  # 오늘 신규 공고 (bid_ntce_dt 기준)
    deadline_soon: int  # 마감 임박 (3일 이내)
    analysis_done: int  # AI 분석 완료 (이번 달)
    proposal_count: int  # 생성된 제안목차 수


class BidListItem(BaseModel):
    """공고 목록 단건 스키마"""

    id: int
    bid_ntce_no: str
    bid_ntce_nm: str
    ntce_instt_nm: str | None
    ntce_kind_nm: str | None
    is_isp_ismp: bool
    isp_ismp_type: str | None  # ISP / ISMP / SI / None
    is_bookmarked: bool  # 관심 공고 여부
    is_in_progress: bool  # 진행 프로젝트 여부
    presmpt_prce: float | None  # 추정가격
    asign_bdgt_amt: float | None  # 배정예산 (추정가격 없을 때 대체)
    bid_clse_dt: datetime | None  # 입찰마감일시
    bid_ntce_dt: datetime | None  # 나라장터 공고 등록일
    collected_at: datetime | None  # 우리 DB 수집 시각
    pipeline_status: str  # collected / parsing / analyzed / failed

    class Config:
        from_attributes = True


class BidListResponse(BaseModel):
    """공고 목록 응답 스키마"""

    total: int  # 필터 조건 기준 전체 건수 (페이지네이션용)
    bids: list[BidListItem]


class BidDetailResponse(BaseModel):
    """공고 상세 응답 스키마 (AI 분석 결과는 /analysis/{bid_ntce_no} 에서 제공)"""

    id: int
    bid_ntce_no: str
    bid_ntce_ord: str
    notice_type: str
    bid_ntce_nm: str
    ntce_instt_nm: str | None
    dminstt_nm: str | None  # 수요기관
    bid_mtd_nm: str | None  # 입찰방법
    cntrct_cncls_mthd_nm: str | None  # 계약방법
    ntce_kind_nm: str | None
    is_isp_ismp: bool
    isp_ismp_type: str | None
    is_bookmarked: bool  # 관심 공고 여부
    is_in_progress: bool  # 진행 프로젝트 여부
    asign_bdgt_amt: float | None
    presmpt_prce: float | None
    bid_clse_dt: datetime | None
    bid_ntce_dt: datetime | None
    openg_dt: datetime | None  # 개찰일시
    bid_ntce_dtl_url: str | None  # 나라장터 공고 원문 URL
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


def _parse_date(date_str: str | None, end_of_day: bool = False) -> datetime | None:
    """YYYY-MM-DD 문자열을 UTC datetime으로 변환한다."""
    if not date_str:
        return None
    dt = datetime.strptime(date_str, "%Y-%m-%d")
    if end_of_day:
        dt = dt.replace(hour=23, minute=59, second=59)
    return dt.replace(tzinfo=timezone.utc)


def _resolve_date_range(
    date_range: str | None,
    date_from: str | None,
    date_to: str | None,
) -> tuple[datetime | None, datetime | None]:
    """date_range 편의 파라미터를 dt_from/dt_to로 변환한다.
    date_from/date_to가 직접 지정된 경우 우선 적용한다.
    """
    if date_from or date_to:
        return _parse_date(date_from), _parse_date(date_to, end_of_day=True)

    now = datetime.now(tz=KST)

    def start_of_day(d: datetime) -> datetime:
        return d.replace(hour=0, minute=0, second=0, microsecond=0)

    def end_of_day(d: datetime) -> datetime:
        return d.replace(hour=23, minute=59, second=59, microsecond=0)

    today = start_of_day(now)

    if date_range == "today":
        return today, end_of_day(now)
    if date_range == "yesterday":
        yesterday = today - timedelta(days=1)
        return yesterday, end_of_day(yesterday)
    if date_range == "3days":
        return today - timedelta(days=2), end_of_day(now)
    if date_range == "1week":
        return today - timedelta(days=6), end_of_day(now)
    # "all" 또는 None → 필터 없음
    return None, None


# ──────────────────────────────────────
# 엔드포인트
# ──────────────────────────────────────


@router.get(
    "/stats", summary="대시보드 KPI 통계 카드", response_model=DashboardStatsResponse
)
async def dashboard_stats(
    db: AsyncSession = Depends(get_db),
) -> DashboardStatsResponse:
    """대시보드 상단 KPI 카드 4개 데이터를 반환한다."""
    stats = await get_dashboard_stats(db)
    return DashboardStatsResponse(**stats)


@router.get(
    "/type-stats",
    summary="공고 유형별 통계 (도넛 차트)",
    response_model=list[TypeStatItem],
)
async def type_stats(
    db: AsyncSession = Depends(get_db),
) -> list[TypeStatItem]:
    """ISP/ISMP/기타 유형별 건수와 비율을 반환한다."""
    stats = await get_type_stats(db)
    return [TypeStatItem(**s) for s in stats]


@router.get("", summary="공고 목록 조회", response_model=BidListResponse)
async def list_bids(
    limit: int = Query(20, ge=1, le=100, description="페이지당 건수"),
    offset: int = Query(0, ge=0, description="건너뛸 건수"),
    isp_ismp_only: bool = Query(False, description="ISP/ISMP 공고만 조회"),
    bookmarked_only: bool = Query(False, description="관심 표시한 공고만 조회"),
    in_progress_only: bool = Query(False, description="진행 프로젝트 공고만 조회"),
    ntce_kind: str | None = Query(None, description="공고 종류 필터 (예: 용역)"),
    date_range: str | None = Query(
        None, description="날짜 범위: today / yesterday / 3days / 1week / all"
    ),
    date_from: str | None = Query(
        None, description="공고 등록일 시작 YYYY-MM-DD (date_range보다 우선)"
    ),
    date_to: str | None = Query(
        None, description="공고 등록일 종료 YYYY-MM-DD (date_range보다 우선)"
    ),
    search: str | None = Query(None, description="공고명·기관명·공고번호 검색"),
    db: AsyncSession = Depends(get_db),
) -> BidListResponse:
    """DB에 저장된 공고 목록을 입찰마감일 오름차순으로 반환한다.

    날짜 필터 우선순위: date_from/date_to > date_range
    - date_range=today      : 오늘 등록 공고
    - date_range=yesterday  : 어제 등록 공고
    - date_range=3days      : 최근 3일 (오늘 포함)
    - date_range=1week      : 최근 7일 (오늘 포함)
    - date_range=all 또는 미지정: 전체
    """
    dt_from, dt_to = _resolve_date_range(date_range, date_from, date_to)

    total = await count_notices(
        db,
        isp_ismp_only=isp_ismp_only,
        bookmarked_only=bookmarked_only,
        in_progress_only=in_progress_only,
        ntce_kind=ntce_kind,
        date_from=dt_from,
        date_to=dt_to,
        search=search,
    )
    notices = await get_notices(
        db,
        limit=limit,
        offset=offset,
        isp_ismp_only=isp_ismp_only,
        bookmarked_only=bookmarked_only,
        in_progress_only=in_progress_only,
        ntce_kind=ntce_kind,
        date_from=dt_from,
        date_to=dt_to,
        search=search,
    )
    return BidListResponse(
        total=total,
        bids=[BidListItem.model_validate(n) for n in notices],
    )


@router.patch(
    "/{bid_ntce_no}/bookmark", summary="관심 공고 설정/해제", response_model=BidListItem
)
async def toggle_bookmark(
    bid_ntce_no: str,
    is_bookmarked: bool = Query(..., description="true=관심 추가, false=관심 해제"),
    db: AsyncSession = Depends(get_db),
) -> BidListItem:
    """공고 관심 여부를 설정한다."""
    notice = await set_bookmark(db, bid_ntce_no, is_bookmarked)
    if not notice:
        raise HTTPException(status_code=404, detail="공고를 찾을 수 없습니다.")
    return BidListItem.model_validate(notice)


@router.patch(
    "/{bid_ntce_no}/in_progress",
    summary="진행 프로젝트 설정/해제",
    response_model=BidListItem,
)
async def toggle_in_progress(
    bid_ntce_no: str,
    is_in_progress: bool = Query(..., description="true=진행 시작, false=진행 해제"),
    db: AsyncSession = Depends(get_db),
) -> BidListItem:
    """공고 진행 여부를 설정한다. 진행 시 관심공고도 자동으로 설정된다."""
    notice = await set_in_progress(db, bid_ntce_no, is_in_progress)
    if not notice:
        raise HTTPException(status_code=404, detail="공고를 찾을 수 없습니다.")
    return BidListItem.model_validate(notice)


@router.get(
    "/collect/preview",
    summary="수집 미리보기 (DB 저장 안 함)",
    response_model=BidPreviewResponse,
)
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
        result = await collect_and_save(
            db, start, end, it_only=it_only, download=download
        )
    except (ValueError, RuntimeError) as e:
        raise HTTPException(status_code=502, detail=str(e))

    return CollectResponse(**result)


class SearchResponse(BaseModel):
    """공고 검색 응답 스키마"""

    source: str  # "db" | "naramarket" | "empty"
    results: list[BidListItem]
    total: int


@router.get("/search", summary="공고 검색 (DB → 나라장터 순차 조회)")
async def search_bids(
    query: str,
    db: AsyncSession = Depends(get_db),
) -> SearchResponse:
    """
    공고번호 또는 공고명으로 검색한다.
    DB에 결과가 있으면 즉시 반환하고,
    없으면 나라장터 API에서 실시간 조회 후 DB에 저장하고 반환한다.
    """
    q = query.strip()
    if not q:
        raise HTTPException(status_code=400, detail="검색어를 입력해 주세요.")

    # 1단계: DB 검색
    notices = await search_notices(db, q)
    if notices:
        return SearchResponse(
            source="db",
            results=[BidListItem.model_validate(n) for n in notices],
            total=len(notices),
        )

    # 2단계: 나라장터 API 실시간 검색
    try:
        raw = fetch_bids_by_query(q)
    except (ValueError, RuntimeError) as e:
        raise HTTPException(status_code=502, detail=str(e))

    if not raw:
        return SearchResponse(source="empty", results=[], total=0)

    # 3단계: 검색 결과 DB 저장 (중복 제외)
    from datetime import datetime, timezone

    for r in raw:
        bid = r["bid"]
        existing = await get_notice_by_bid_no(
            db, bid["bid_ntce_no"], bid["bid_ntce_ord"]
        )
        if existing:
            continue
        notice_type, is_isp_ismp, isp_ismp_type = _classify_notice_type(
            bid["bid_ntce_nm"]
        )
        from backend.collector.service import _parse_dt

        try:
            notice = Notice(
                bid_ntce_no=bid["bid_ntce_no"],
                bid_ntce_ord=bid["bid_ntce_ord"],
                notice_type=notice_type,
                bid_ntce_nm=bid["bid_ntce_nm"],
                ntce_instt_nm=bid["ntce_instt_nm"],
                dminstt_nm=bid["dminstt_nm"],
                bid_mtd_nm=bid["bid_mtd_nm"],
                cntrct_cncls_mthd_nm=bid["cntrct_cncls_mthd_nm"],
                is_isp_ismp=is_isp_ismp,
                isp_ismp_type=isp_ismp_type,
                presmpt_prce=bid["presmpt_prce"],
                asign_bdgt_amt=bid["asign_bdgt_amt"],
                bid_clse_dt=_parse_dt(bid["bid_clse_dt"]),
                bid_ntce_dt=_parse_dt(bid["bid_ntce_dt"]),
                openg_dt=_parse_dt(bid["openg_dt"]),
                ntce_kind_nm=bid.get("ntce_kind_nm"),
                bid_ntce_dtl_url=bid["bid_ntce_dtl_url"],
                pipeline_status="collected",
                collected_at=datetime.now(timezone.utc),
            )
            from backend.db.crud import create_notice

            await create_notice(db, notice)
        except Exception:
            pass

    # 저장 후 DB에서 재조회하여 반환
    notices = await search_notices(db, q)
    return SearchResponse(
        source="naramarket",
        results=[BidListItem.model_validate(n) for n in notices],
        total=len(notices),
    )


@router.get(
    "/{bid_ntce_no}", summary="공고 상세 조회", response_model=BidDetailResponse
)
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
