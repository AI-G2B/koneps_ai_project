"""
공고 수집 서비스
담당: 최서원

naramarket.py에서 공고를 가져와 DB에 저장하는 공통 로직.
- POST /bids/collect 엔드포인트
- APScheduler 자동 수집
두 곳 모두 이 함수를 호출한다.
"""

from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from backend.collector.file_downloader import download_attachments
from backend.collector.naramarket import _classify_notice_type, fetch_bids
from backend.db.crud import create_attachments, create_notice, get_notice_by_bid_no
from backend.db.models import Notice


def _parse_dt(value: str | None) -> datetime | None:
    """나라장터 API 날짜 문자열을 timezone-aware datetime으로 변환한다."""
    if not value:
        return None
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y%m%d%H%M"):
        try:
            return datetime.strptime(value, fmt).replace(tzinfo=timezone.utc)
        except ValueError:
            continue
    return None


async def collect_and_save(
    db: AsyncSession,
    start_date: str,
    end_date: str,
    it_only: bool = True,
    download: bool = False,
) -> dict:
    """
    나라장터 공고를 수집하여 DB에 저장한다.

    Args:
        db         : DB 세션
        start_date : 수집 시작일 (YYYYMMDD)
        end_date   : 수집 종료일 (YYYYMMDD)
        it_only    : IT 컨설팅 공고만 필터링 여부
        download   : 첨부파일 다운로드 여부

    Returns:
        {"saved": int, "skipped": int, "errors": int}
    """
    results = fetch_bids(start_date, end_date, it_only)
    saved = skipped = errors = 0

    for r in results:
        bid = r["bid"]

        # 중복 체크 — 이미 DB에 있으면 건너뜀
        existing = await get_notice_by_bid_no(db, bid["bid_ntce_no"], bid["bid_ntce_ord"])
        if existing:
            skipped += 1
            continue

        # ISP/ISMP 유형 분류
        notice_type, is_isp_ismp, isp_ismp_type = _classify_notice_type(bid["bid_ntce_nm"])

        # 첨부파일 다운로드 (download=True 일 때만 실행)
        downloaded = download_attachments(r["attachments"]) if download else r["attachments"]

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
            await create_notice(db, notice)

            # 전체 첨부파일 저장
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
            errors += 1

    return {"saved": saved, "skipped": skipped, "errors": errors}
