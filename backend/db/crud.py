from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from .models import Notice, AnalysisResult, RiskFactor, ProposalOutline


# notices
async def get_notice_by_id(db: AsyncSession, notice_id: int):
    result = await db.execute(select(Notice).where(Notice.id == notice_id))
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
) -> list[Notice]:
    """공고 목록을 입찰마감일 오름차순으로 반환한다."""
    query = select(Notice)
    if isp_ismp_only:
        query = query.where(Notice.is_isp_ismp == True)
    if ntce_kind:
        query = query.where(Notice.ntce_kind_nm == ntce_kind)
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


# proposal_outlines
async def get_active_outline(db: AsyncSession, notice_id: int):
    result = await db.execute(
        select(ProposalOutline)
        .where(ProposalOutline.notice_id == notice_id, ProposalOutline.is_active == True)
    )
    return result.scalar_one_or_none()