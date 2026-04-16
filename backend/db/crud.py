from datetime import datetime, timedelta, timezone

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from .models import Notice, AnalysisResult, RiskFactor, ProposalOutline


# notices
async def get_notice_by_id(db: AsyncSession, notice_id: int):
    result = await db.execute(select(Notice).where(Notice.id == notice_id))
    return result.scalar_one_or_none()

async def get_notice_detail(db: AsyncSession, bid_ntce_no: str) -> Notice | None:
    """공고번호로 가장 최신 차수의 공고 상세를 반환한다."""
    result = await db.execute(
        select(Notice)
        .where(Notice.bid_ntce_no == bid_ntce_no)
        .order_by(Notice.bid_ntce_ord.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()


async def get_notice_by_bid_no(db: AsyncSession, bid_ntce_no: str, bid_ntce_ord: str = "00"):
    result = await db.execute(
        select(Notice).where(
            Notice.bid_ntce_no == bid_ntce_no,
            Notice.bid_ntce_ord == bid_ntce_ord
        )
    )
    return result.scalar_one_or_none()

async def get_notices(
    db: AsyncSession,
    limit: int = 20,
    offset: int = 0,
    isp_ismp_only: bool = False,
    ntce_kind: str | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
) -> list[Notice]:
    """공고 목록을 입찰마감일 오름차순으로 반환한다."""
    query = select(Notice)
    if isp_ismp_only:
        query = query.where(Notice.is_isp_ismp == True)
    if ntce_kind:
        query = query.where(Notice.ntce_kind_nm == ntce_kind)
    if date_from:
        query = query.where(Notice.bid_ntce_dt >= date_from)
    if date_to:
        query = query.where(Notice.bid_ntce_dt <= date_to)
    query = query.order_by(Notice.bid_clse_dt.asc()).limit(limit).offset(offset)
    result = await db.execute(query)
    return result.scalars().all()


async def get_notices_isp_ismp(db: AsyncSession, limit: int = 20):
    result = await db.execute(
        select(Notice)
        .where(Notice.is_isp_ismp == True)
        .order_by(Notice.bid_clse_dt.asc())
        .limit(limit)
    )
    return result.scalars().all()

async def create_notice(db: AsyncSession, notice: Notice):
    db.add(notice)
    await db.commit()
    await db.refresh(notice)
    return notice

async def update_pipeline_status(db: AsyncSession, notice_id: int, status: str, error_msg: str = None):
    notice = await get_notice_by_id(db, notice_id)
    if notice:
        notice.pipeline_status = status
        if error_msg:
            notice.parse_error_msg = error_msg
        await db.commit()
    return notice


# analysis_results
async def get_analysis_by_notice_id(db: AsyncSession, notice_id: int):
    result = await db.execute(
        select(AnalysisResult).where(AnalysisResult.notice_id == notice_id)
    )
    return result.scalar_one_or_none()

async def upsert_analysis(db: AsyncSession, notice_id: int, data: dict):
    existing = await get_analysis_by_notice_id(db, notice_id)
    if existing:
        for key, value in data.items():
            setattr(existing, key, value)
    else:
        existing = AnalysisResult(notice_id=notice_id, **data)
        db.add(existing)
    await db.commit()
    return existing


# risk_factors
async def get_risk_factors_by_notice(db: AsyncSession, notice_id: int):
    result = await db.execute(
        select(RiskFactor)
        .where(RiskFactor.notice_id == notice_id)
        .order_by(RiskFactor.sort_order)
    )
    return result.scalars().all()

async def create_risk_factors(db: AsyncSession, notice_id: int, factors: list[dict]):
    objs = [RiskFactor(notice_id=notice_id, **f) for f in factors]
    db.add_all(objs)
    await db.commit()
    return objs


async def get_type_stats(db: AsyncSession) -> list[dict]:
    """공고 유형별 건수와 비율을 반환한다. (도넛 차트용)"""
    total = await db.scalar(select(func.count()).select_from(Notice)) or 0

    rows = await db.execute(
        select(Notice.isp_ismp_type, func.count().label("cnt"))
        .group_by(Notice.isp_ismp_type)
    )

    result = []
    for isp_ismp_type, cnt in rows:
        label = isp_ismp_type if isp_ismp_type else "기타"
        result.append({
            "type": label,
            "count": cnt,
            "ratio": round(cnt / total * 100, 1) if total else 0,
        })

    # 비율 내림차순 정렬
    result.sort(key=lambda x: x["count"], reverse=True)
    return result


async def get_dashboard_stats(db: AsyncSession) -> dict:
    """대시보드 상단 통계 카드 4개 데이터를 반환한다."""
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    three_days_later = now + timedelta(days=3)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    # 오늘 신규 공고 수 (나라장터 공고 등록일 기준)
    today_count = await db.scalar(
        select(func.count()).where(Notice.bid_ntce_dt >= today_start)
    )

    # 마감 임박 공고 수 (3일 이내)
    deadline_count = await db.scalar(
        select(func.count()).where(
            Notice.bid_clse_dt >= now,
            Notice.bid_clse_dt <= three_days_later,
        )
    )

    # AI 분석 완료 수 (이번 달)
    analysis_count = await db.scalar(
        select(func.count()).where(AnalysisResult.analyzed_at >= month_start)
    )

    # 제안 공고 수 (proposal_outlines 전체)
    proposal_count = await db.scalar(
        select(func.count()).select_from(ProposalOutline)
    )

    return {
        "today_new": today_count or 0,
        "deadline_soon": deadline_count or 0,
        "analysis_done": analysis_count or 0,
        "proposal_count": proposal_count or 0,
    }


# proposal_outlines
async def get_active_outline(db: AsyncSession, notice_id: int):
    result = await db.execute(
        select(ProposalOutline)
        .where(ProposalOutline.notice_id == notice_id, ProposalOutline.is_active == True)
    )
    return result.scalar_one_or_none()