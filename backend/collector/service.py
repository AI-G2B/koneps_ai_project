"""
공고 수집 서비스
담당: 최서원

naramarket.py에서 공고를 가져와 DB에 저장하는 공통 로직.
- POST /bids/collect 엔드포인트
- APScheduler 자동 수집
- 검색 결과 저장 (search_bids)
세 곳 모두 이 파일을 호출한다.
"""

import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy.ext.asyncio import AsyncSession

KST = timezone(timedelta(hours=9))

logger = logging.getLogger(__name__)

from backend.collector.file_downloader import download_attachments
from backend.collector.naramarket import fetch_bids
from backend.db.crud import create_attachments, create_notice, get_notice_by_bid_no
from backend.db.models import Notice


def _parse_dt(value: str | None) -> datetime | None:
    """나라장터 API 날짜 문자열(KST)을 timezone-aware datetime으로 변환한다."""
    if not value:
        return None
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y%m%d%H%M"):
        try:
            return datetime.strptime(value, fmt).replace(tzinfo=KST)
        except ValueError:
            continue
    return None


async def save_bids(
    db: AsyncSession,
    results: list[dict],
    download: bool = False,
) -> dict:
    """
    naramarket.py에서 반환된 공고 목록을 DB에 저장한다.

    Args:
        db      : DB 세션
        results : fetch_bids / fetch_bids_by_query 반환값
        download: 첨부파일 다운로드 여부

    Returns:
        {"saved": int, "skipped": int, "errors": int}
    """
    saved = skipped = errors = 0

    for r in results:
        bid = r["bid"]

        existing = await get_notice_by_bid_no(db, bid["bid_ntce_no"], bid["bid_ntce_ord"])
        if existing:
            skipped += 1
            continue

        downloaded = download_attachments(r["attachments"]) if download else r["attachments"]

        try:
            notice = Notice(
                bid_ntce_no=bid["bid_ntce_no"],
                bid_ntce_ord=bid["bid_ntce_ord"],
                notice_type=bid["notice_type"],
                bid_ntce_nm=bid["bid_ntce_nm"],
                ntce_instt_nm=bid["ntce_instt_nm"],
                dminstt_nm=bid["dminstt_nm"],
                bid_mtd_nm=bid["bid_mtd_nm"],
                cntrct_cncls_mthd_nm=bid["cntrct_cncls_mthd_nm"],
                is_isp_ismp=bid["is_isp_ismp"],
                isp_ismp_type=bid["isp_ismp_type"],
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
            await create_notice(db, notice)

            now = datetime.now(timezone.utc)
            attachment_rows = [
                {
                    "file_name": a["file_name"],
                    "file_url": a["file_url"],
                    "file_type": a["file_type"],
                    "local_path": a.get("local_path"),
                    "parse_status": "pending",
                    "downloaded_at": now if a.get("local_path") else None,
                }
                for a in downloaded
            ]
            if attachment_rows:
                await create_attachments(db, notice.id, attachment_rows)

            saved += 1
        except Exception:
            logger.exception("공고 저장 실패: %s", bid.get("bid_ntce_no", "unknown"))
            errors += 1

    return {"saved": saved, "skipped": skipped, "errors": errors}


async def collect_and_save(
    db: AsyncSession,
    start_date: str,
    end_date: str,
    start_time: str = "0000",
    end_time: str = "2359",
    download: bool = False,
) -> dict:
    """
    나라장터 공고를 수집하여 DB에 저장한다.

    Args:
        db         : DB 세션
        start_date : 수집 시작일 (YYYYMMDD)
        end_date   : 수집 종료일 (YYYYMMDD)
        start_time : 조회 시작 시각 HHMM (기본 "0000")
        end_time   : 조회 종료 시각 HHMM (기본 "2359")
        download   : 첨부파일 다운로드 여부

    Returns:
        {"saved": int, "skipped": int, "errors": int}
    """
    results = fetch_bids(start_date, end_date, start_time, end_time)
    return await save_bids(db, results, download)
