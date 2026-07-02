from datetime import date, datetime, timedelta, timezone

from sqlalchemy import and_, delete, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from .models import AgencySetting, AnalysisResult, Attachment, Notice, NoticeMemo, ProposalOutline, User

KST = timezone(timedelta(hours=9))


# notices
async def get_notice_by_id(db: AsyncSession, notice_id: int):
    result = await db.execute(select(Notice).where(Notice.id == notice_id))
    return result.scalar_one_or_none()


async def get_notice_detail(db: AsyncSession, bid_ntce_no: str) -> Notice | None:
    """공고번호로 가장 최신 차수의 공고 상세를 반환한다."""
    result = await db.execute(
        select(Notice)
        .options(
            selectinload(Notice.attachments),
            selectinload(Notice.analysis_result),
        )
        .where(Notice.bid_ntce_no == bid_ntce_no)
        .order_by(Notice.bid_ntce_ord.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()


async def get_notice_by_bid_no(
    db: AsyncSession, bid_ntce_no: str, bid_ntce_ord: str = "00"
):
    result = await db.execute(
        select(Notice).where(
            Notice.bid_ntce_no == bid_ntce_no, Notice.bid_ntce_ord == bid_ntce_ord
        )
    )
    return result.scalar_one_or_none()


def _apply_notice_filters(
    query,
    isp_ismp_only: bool = False,
    bookmarked_only: bool = False,
    in_progress_only: bool = False,
    exclude_expired: bool = False,
    ntce_kind: str | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    search: str | None = None,
):
    """공고 쿼리에 공통 필터 조건을 적용한다."""
    if isp_ismp_only:
        query = query.where(Notice.is_isp_ismp.is_(True))
    if bookmarked_only:
        query = query.where(Notice.is_bookmarked.is_(True))
    if in_progress_only:
        query = query.where(Notice.is_in_progress.is_(True))
    if exclude_expired:
        now = datetime.now(KST)
        query = query.where(
            or_(Notice.bid_clse_dt.is_(None), Notice.bid_clse_dt >= now)
        )
    if ntce_kind:
        query = query.where(Notice.ntce_kind_nm == ntce_kind)
    if date_from:
        query = query.where(Notice.bid_ntce_dt >= date_from)
    if date_to:
        query = query.where(Notice.bid_ntce_dt <= date_to)
    if search:
        like = f"%{search}%"
        query = query.where(
            or_(
                Notice.bid_ntce_nm.ilike(like),
                Notice.ntce_instt_nm.ilike(like),
                Notice.bid_ntce_no.ilike(like),
            )
        )
    return query


def _latest_ord_subquery():
    """공고번호별 최신 차수(bid_ntce_ord)만 남기는 서브쿼리를 반환한다.
    정정공고로 동일 bid_ntce_no가 복수 수집되는 경우 중복을 제거한다."""
    return (
        select(
            Notice.bid_ntce_no.label("bno"),
            func.max(Notice.bid_ntce_ord).label("max_ord"),
        )
        .group_by(Notice.bid_ntce_no)
        .subquery()
    )


async def get_notices(
    db: AsyncSession,
    limit: int = 20,
    offset: int = 0,
    isp_ismp_only: bool = False,
    bookmarked_only: bool = False,
    in_progress_only: bool = False,
    exclude_expired: bool = False,
    ntce_kind: str | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    search: str | None = None,
) -> list[Notice]:
    """공고 목록을 수집일 내림차순으로 반환한다. 동일 공고번호는 최신 차수만 포함한다."""
    sq = _latest_ord_subquery()
    query = (
        select(Notice)
        .join(sq, and_(Notice.bid_ntce_no == sq.c.bno, Notice.bid_ntce_ord == sq.c.max_ord))
    )
    query = _apply_notice_filters(
        query,
        isp_ismp_only,
        bookmarked_only,
        in_progress_only,
        exclude_expired,
        ntce_kind,
        date_from,
        date_to,
        search,
    )
    query = query.order_by(Notice.collected_at.desc()).limit(limit).offset(offset)
    result = await db.execute(query)
    return result.scalars().all()


async def count_notices(
    db: AsyncSession,
    isp_ismp_only: bool = False,
    bookmarked_only: bool = False,
    in_progress_only: bool = False,
    exclude_expired: bool = False,
    ntce_kind: str | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    search: str | None = None,
) -> int:
    """페이지네이션용 공고 총 건수를 반환한다. 동일 공고번호는 최신 차수만 집계한다."""
    sq = _latest_ord_subquery()
    query = (
        select(func.count())
        .select_from(Notice)
        .join(sq, and_(Notice.bid_ntce_no == sq.c.bno, Notice.bid_ntce_ord == sq.c.max_ord))
    )
    query = _apply_notice_filters(
        query, isp_ismp_only, bookmarked_only, in_progress_only, exclude_expired, ntce_kind, date_from, date_to, search
    )
    return await db.scalar(query) or 0


async def set_bookmark(db: AsyncSession, bid_ntce_no: str, is_bookmarked: bool) -> Notice | None:
    """공고 관심 여부를 설정한다."""
    notice = await get_notice_detail(db, bid_ntce_no)
    if not notice:
        return None
    notice.is_bookmarked = is_bookmarked
    await db.commit()
    await db.refresh(notice)
    return notice


async def set_in_progress(db: AsyncSession, bid_ntce_no: str, is_in_progress: bool) -> Notice | None:
    """공고 진행 여부를 설정한다. 진행 시 관심공고도 자동 설정한다."""
    notice = await get_notice_detail(db, bid_ntce_no)
    if not notice:
        return None
    notice.is_in_progress = is_in_progress
    if is_in_progress:
        notice.is_bookmarked = True
        notice.in_progress_at = date.today()
    else:
        notice.in_progress_at = None
    await db.commit()
    await db.refresh(notice)
    return notice


async def update_managers(
    db: AsyncSession, bid_ntce_no: str, sales_manager: str, project_pm: str
) -> Notice | None:
    """공고의 영업담당자와 담당 PM을 저장한다."""
    notice = await get_notice_detail(db, bid_ntce_no)
    if not notice:
        return None
    notice.sales_manager = sales_manager or None
    notice.project_pm = project_pm or None
    await db.commit()
    await db.refresh(notice)
    return notice


async def search_notices(db: AsyncSession, query: str, limit: int = 20) -> list[Notice]:
    """공고번호, 공고명, 기관명에서 query를 포함하는 공고를 반환한다. 최신 차수만 반환한다."""
    sq = _latest_ord_subquery()
    like = f"%{query}%"
    result = await db.execute(
        select(Notice)
        .join(sq, and_(Notice.bid_ntce_no == sq.c.bno, Notice.bid_ntce_ord == sq.c.max_ord))
        .where(
            or_(
                Notice.bid_ntce_no.ilike(like),
                Notice.bid_ntce_nm.ilike(like),
                Notice.ntce_instt_nm.ilike(like),
            )
        )
        .order_by(Notice.bid_clse_dt.asc())
        .limit(limit)
    )
    return result.scalars().all()


async def get_notices_isp_ismp(db: AsyncSession, limit: int = 20):
    """ISP/ISMP 공고 목록을 마감일 오름차순으로 반환한다. 동일 공고번호는 최신 차수만 포함한다."""
    sq = _latest_ord_subquery()
    result = await db.execute(
        select(Notice)
        .join(sq, and_(Notice.bid_ntce_no == sq.c.bno, Notice.bid_ntce_ord == sq.c.max_ord))
        .where(Notice.is_isp_ismp.is_(True))
        .order_by(Notice.bid_clse_dt.asc())
        .limit(limit)
    )
    return result.scalars().all()


async def create_attachments(
    db: AsyncSession, notice_id: int, attachments: list[dict]
) -> list[Attachment]:
    """공고 첨부파일 목록을 DB에 저장한다."""
    objs = [Attachment(notice_id=notice_id, **a) for a in attachments]
    db.add_all(objs)
    await db.commit()
    return objs


async def get_attachments_by_notice(
    db: AsyncSession, notice_id: int
) -> list[Attachment]:
    """공고 ID로 첨부파일 목록을 반환한다."""
    result = await db.execute(
        select(Attachment).where(Attachment.notice_id == notice_id)
    )
    return result.scalars().all()


async def create_notice(db: AsyncSession, notice: Notice):
    db.add(notice)
    await db.commit()
    await db.refresh(notice)
    return notice


async def update_pipeline_status(
    db: AsyncSession, notice_id: int, status: str, error_msg: str = None
):
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


async def delete_analysis_by_notice_id(db: AsyncSession, notice_id: int) -> bool:
    existing = await get_analysis_by_notice_id(db, notice_id)
    if not existing:
        return False
    await db.delete(existing)
    await db.commit()
    return True


async def get_type_stats(db: AsyncSession) -> list[dict]:
    """공고 유형별 건수와 비율을 반환한다. (도넛 차트용) 동일 공고번호는 최신 차수만 집계한다."""
    sq = _latest_ord_subquery()
    # 최신 차수만 남긴 서브쿼리와 JOIN 후 집계
    deduped = (
        select(Notice.isp_ismp_type)
        .join(sq, and_(Notice.bid_ntce_no == sq.c.bno, Notice.bid_ntce_ord == sq.c.max_ord))
        .subquery()
    )
    total = await db.scalar(select(func.count()).select_from(deduped)) or 0

    rows = await db.execute(
        select(deduped.c.isp_ismp_type, func.count().label("cnt")).group_by(
            deduped.c.isp_ismp_type
        )
    )

    result = []
    for isp_ismp_type, cnt in rows:
        label = isp_ismp_type if isp_ismp_type else "기타"
        result.append(
            {
                "type": label,
                "count": cnt,
                "ratio": round(cnt / total * 100, 1) if total else 0,
            }
        )

    # 비율 내림차순 정렬
    result.sort(key=lambda x: x["count"], reverse=True)
    return result


async def get_dashboard_stats(db: AsyncSession) -> dict:
    """대시보드 상단 통계 카드 4개 데이터를 반환한다."""
    now = datetime.now(KST)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    three_days_later = now + timedelta(days=3)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    sq = _latest_ord_subquery()

    # 오늘 신규 공고 수 (나라장터 공고 등록일 기준, 최신 차수만)
    today_count = await db.scalar(
        select(func.count())
        .select_from(Notice)
        .join(sq, and_(Notice.bid_ntce_no == sq.c.bno, Notice.bid_ntce_ord == sq.c.max_ord))
        .where(Notice.bid_ntce_dt >= today_start)
    )

    # 마감 임박 공고 수 (3일 이내, 최신 차수만)
    deadline_count = await db.scalar(
        select(func.count())
        .select_from(Notice)
        .join(sq, and_(Notice.bid_ntce_no == sq.c.bno, Notice.bid_ntce_ord == sq.c.max_ord))
        .where(
            Notice.bid_clse_dt >= now,
            Notice.bid_clse_dt <= three_days_later,
        )
    )

    # AI 분석 완료 수 (이번 달)
    analysis_count = await db.scalar(
        select(func.count()).where(AnalysisResult.analyzed_at >= month_start)
    )

    # 제안 공고 수 (proposal_outlines 전체)
    proposal_count = await db.scalar(select(func.count()).select_from(ProposalOutline))

    return {
        "today_new": today_count or 0,
        "deadline_soon": deadline_count or 0,
        "analysis_done": analysis_count or 0,
        "proposal_count": proposal_count or 0,
    }


# proposal_outlines
async def get_active_outline(db: AsyncSession, notice_id: int):
    result = await db.execute(
        select(ProposalOutline).where(
            ProposalOutline.notice_id == notice_id, ProposalOutline.is_active.is_(True)
        )
    )
    return result.scalar_one_or_none()


# agency_settings
async def get_agency_settings(db: AsyncSession, user_id: int) -> list[AgencySetting]:
    """사용자의 선호/기피 기관 설정 목록을 반환한다."""
    result = await db.execute(
        select(AgencySetting).where(AgencySetting.user_id == user_id)
    )
    return list(result.scalars().all())


async def save_agency_settings(
    db: AsyncSession,
    user_id: int,
    preferred: list[str],
    avoided: list[str],
) -> list[AgencySetting]:
    """선호/기피 기관 설정을 전체 교체 방식으로 저장한다."""
    await db.execute(
        delete(AgencySetting).where(AgencySetting.user_id == user_id)
    )
    new_settings = [
        AgencySetting(user_id=user_id, agency_name=name, setting_type="preferred")
        for name in preferred
    ] + [
        AgencySetting(user_id=user_id, agency_name=name, setting_type="avoided")
        for name in avoided
    ]
    db.add_all(new_settings)
    await db.commit()
    return new_settings


# users
async def get_user_by_username(db: AsyncSession, username: str) -> User | None:
    result = await db.execute(
        select(User).where(User.username == username)
    )
    return result.scalar_one_or_none()


async def create_user(db: AsyncSession, username: str, hashed_pw: str, name: str, role: str) -> User:
    user = User(username=username, password=hashed_pw, name=name, role=role)
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def update_user_profile(
    db: AsyncSession,
    user_id: int,
    name: str | None,
    hashed_pw: str | None,
    role: str | None = None,
) -> User | None:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        return None
    if name is not None:
        user.name = name
    if hashed_pw is not None:
        user.password = hashed_pw
    if role is not None:
        user.role = role
    await db.commit()
    await db.refresh(user)
    return user


# notice_memos
async def get_memo_by_notice_id(db: AsyncSession, notice_id: int) -> NoticeMemo | None:
    result = await db.execute(
        select(NoticeMemo).where(NoticeMemo.notice_id == notice_id)
    )
    return result.scalar_one_or_none()


async def upsert_memo(
    db: AsyncSession,
    notice_id: int,
    content: str,
    author_id: int | None = None,
    author_name: str | None = None,
) -> NoticeMemo:
    memo = await get_memo_by_notice_id(db, notice_id)
    if memo:
        memo.content = content
        if author_id is not None:
            memo.author_id = author_id
        if author_name is not None:
            memo.author_name = author_name
    else:
        memo = NoticeMemo(notice_id=notice_id, content=content, author_id=author_id, author_name=author_name)
        db.add(memo)
    await db.commit()
    await db.refresh(memo)
    return memo
