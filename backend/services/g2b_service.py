"""나라장터 e-발주 첨부파일(제안요청서/과업지시서) 조회 + 저장.

기존 collector는 공고 등록 시 ntceSpecDocUrl(입찰공고서/공고문)만 받아오므로
입찰공고서만 첨부된 공고가 많다. e-발주 API로 제안요청서/과업지시서를
보강해야 AI 분석에서 requirements / eval_criteria 추출이 가능하다.

원본: G2B_AI/backend/services/g2b_service.py (강현묵).
koneps로 이식하면서 asyncpg raw SQL → SQLAlchemy ORM으로 어댑팅.
"""
import logging
import os
from datetime import datetime, timedelta, timezone

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.db.models import Attachment

logger = logging.getLogger(__name__)

# 나라장터 전자입찰 첨부파일 조회 API (제안요청서/과업지시서 등 상세 파일)
G2B_ATCH_FILE_URL = (
    "https://apis.data.go.kr/1230000/ad/BidPublicInfoService"
    "/getBidPblancListInfoEorderAtchFileInfo"
)

KST = timezone(timedelta(hours=9))


async def fetch_eorder_attachments(bid_ntce_no: str, bid_ntce_dt: str = "") -> list[dict]:
    """20번 API로 전자입찰 첨부파일을 조회한다.

    이 API는 bidNtceNo로 직접 필터링이 안 되므로, 공고일 당일 범위로 페이지를
    돌며 공고번호를 매칭한다. 매칭되는 건이 나오면 즉시 종료.
    """
    api_key = os.getenv("NARA_API_KEY", "")
    if not api_key:
        logger.warning("NARA_API_KEY 미설정 → e-발주 첨부 조회 skip")
        return []

    # bid_ntce_dt 정규화: "YYYY-MM-DDTHH:mm:ss" 또는 "YYYYMMDD..." → "YYYYMMDD"
    if bid_ntce_dt and len(bid_ntce_dt) >= 8:
        clean = bid_ntce_dt.replace("-", "").replace(" ", "").replace(":", "").replace("T", "")[:8]
        bgn, end = clean + "0000", clean + "2359"
    else:
        now = datetime.now(KST)
        bgn = now.strftime("%Y%m%d") + "0000"
        end = now.strftime("%Y%m%d") + "2359"

    result: list[dict] = []
    for page in range(1, 50):
        params = {
            "serviceKey": api_key,
            "pageNo": page,
            "numOfRows": 100,
            "inqryDiv": 1,
            "inqryBgnDt": bgn,
            "inqryEndDt": end,
            "type": "json",
        }
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.get(G2B_ATCH_FILE_URL, params=params)
                resp.raise_for_status()
                body = resp.json().get("response", {}).get("body", {})
                items = body.get("items", "")
                if not items:
                    break
                item_list = items if isinstance(items, list) else items.get("item", [])
                if isinstance(item_list, dict):
                    item_list = [item_list]

                for item in item_list:
                    if item.get("bidNtceNo") == bid_ntce_no:
                        name = item.get("eorderAtchFileNm", "")
                        url = item.get("eorderAtchFileUrl", "")
                        if name and url:
                            ext = name.rsplit(".", 1)[-1].lower() if "." in name else "unknown"
                            result.append({
                                "file_name": name,
                                "file_url": url,
                                "file_type": ext,
                            })

                if result:
                    break
                if len(item_list) < 100:
                    break
        except Exception as e:  # noqa: BLE001
            logger.warning(f"e-발주 API 호출 실패 (page {page}, bid_ntce_no={bid_ntce_no}): {e}")
            break

    logger.info(f"e-발주 첨부 조회 결과: {len(result)}건 (bid_ntce_no={bid_ntce_no})")
    return result


async def save_eorder_attachments(
    db: AsyncSession, notice_id: int, attachments: list[dict]
) -> int:
    """e-발주 첨부를 attachments 테이블에 저장. 동일 file_name은 skip. 저장 건수 반환."""
    if not attachments:
        return 0

    existing_names = set(
        (await db.execute(
            select(Attachment.file_name).where(Attachment.notice_id == notice_id)
        )).scalars().all()
    )

    saved = 0
    for att in attachments:
        if att["file_name"] in existing_names:
            continue
        db.add(Attachment(
            notice_id=notice_id,
            file_name=att["file_name"],
            file_url=att["file_url"],
            file_type=att["file_type"],
            local_path=att.get("local_path"),
        ))
        saved += 1
    if saved:
        await db.commit()
    return saved
