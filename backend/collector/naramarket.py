"""
나라장터 OpenAPI 공고 수집
담당: 최서원

흐름: 이 파일에서 API 호출 → 공고 목록 반환
→ 강주현 DB에 저장 → 강현묵 AI 분석
"""

import requests
import os
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("NARA_API_KEY", "")

# 나라장터 입찰공고 목록 API
BID_LIST_URL = (
    "https://apis.data.go.kr/1230000/ad/BidPublicInfoService/getBidPblancListInfoServc"
)

# 단독으로 걸리는 키워드 — 공고명에 있으면 컨설팅 여부 무관하게 포함
STANDALONE_KEYWORDS = [
    "ISP",
    "ISMP",
    "정보화전략",
    "정보화계획",
    "디지털전환",
]

# "컨설팅"과 함께 있어야 걸리는 IT 관련 키워드
CONSULTING_KEYWORDS = [
    "IT",
    "ICT",
    "SW",
    "AI",
    "인공지능",
    "정보",
    "디지털",
    "클라우드",
    "보안",
    "사이버",
    "시스템",
    "ERP",
    "데이터",
    "DX",
]


# ──────────────────────────────────────
# 내부 필터 함수
# ──────────────────────────────────────


def _is_it_consulting(item: dict) -> bool:
    """IT 컨설팅 공고인지 판별"""
    name = item.get("bidNtceNm", "")
    name_lower = name.lower()

    # 1) 단독 키워드가 공고명에 있으면 바로 포함
    if any(kw.lower() in name_lower for kw in STANDALONE_KEYWORDS):
        return True

    # 2) "컨설팅" 또는 "계획 수립" + IT 관련 키워드가 동시에 있으면 포함
    trigger = "컨설팅" in name_lower or "계획 수립" in name_lower or "기본계획" in name_lower or "마스터플랜" in name_lower
    if trigger:
        if any(kw.lower() in name_lower for kw in CONSULTING_KEYWORDS):
            return True

    return False


def _is_service_bid(item: dict) -> bool:
    """용역 공고인지 판별 - 물품/공사 제외"""
    large = item.get("pubPrcrmntLrgClsfcNm", "")
    return not any(exc in large for exc in ["물품", "공사", "시설"])


def _safe_int(value) -> int | None:
    try:
        return int(value) if value else None
    except (ValueError, TypeError):
        return None


# ──────────────────────────────────────
# 데이터 변환 함수
# ──────────────────────────────────────


def parse_bid(item: dict) -> dict:
    """API 응답 → DB 저장용 딕셔너리"""
    return {
        "bid_ntce_no": item.get("bidNtceNo", ""),
        "bid_ntce_ord": item.get("bidNtceOrd", ""),       # 입찰공고차수 (재공고 판별)
        "bid_ntce_nm": item.get("bidNtceNm", ""),
        "ntce_instt_nm": item.get("ntceInsttNm", ""),     # 공고기관명
        "dminstt_nm": item.get("dminsttNm", ""),           # 수요기관명
        "bid_clse_dt": item.get("bidClseDt", ""),          # 입찰마감일시 ★
        "bid_ntce_dt": item.get("bidNtceDt", ""),          # 입찰공고일시
        "openg_dt": item.get("opengDt", ""),               # 개찰일시
        "presmpt_prce": _safe_int(item.get("presmptPrce")),
        "asign_bdgt_amt": _safe_int(item.get("asignBdgtAmt")),
        "ntce_kind_nm": item.get("ntceKindNm", ""),
        "cntrct_cncls_mthd_nm": item.get("cntrctCnclsMthdNm", ""),
        "pub_prcrmnt_lrg_clsfc_nm": item.get("pubPrcrmntLrgClsfcNm", ""),
        "pub_prcrmnt_clsfc_nm": item.get("pubPrcrmntClsfcNm", ""),
        "info_biz_yn": item.get("infoBizYn", ""),          # 정보화사업여부 Y/N
        "bid_ntce_dtl_url": item.get("bidNtceDtlUrl", ""), # 공고 상세 URL
        "is_canceled": "취소" in item.get("ntceKindNm", ""),
        "is_corrected": "정정" in item.get("ntceKindNm", ""),
    }


def parse_attachments(item: dict) -> list[dict]:
    """첨부파일 URL/이름 파싱 (API 응답에 최대 5개)"""
    attachments = []
    for i in range(1, 6):
        url = item.get(f"ntceSpecDocUrl{i}", "")
        name = item.get(f"ntceSpecFileNm{i}", "")
        if url and name:
            ext = name.rsplit(".", 1)[-1].lower() if "." in name else "unknown"
            attachments.append(
                {
                    "file_name": name,
                    "file_url": url,
                    "file_type": ext,  # pdf / hwp / doc 등
                    "parse_status": "pending",  # 강현묵이 파싱 후 done으로 바꿈
                }
            )
    return attachments


# ──────────────────────────────────────
# 핵심: API 호출
# ──────────────────────────────────────


def fetch_bids(start_date: str, end_date: str, it_only: bool = True) -> list[dict]:
    """
    나라장터 OpenAPI 호출 → 공고 목록 반환

    Args:
        start_date : 조회 시작일 YYYYMMDD (예: "20260401")
        end_date   : 조회 종료일 YYYYMMDD (예: "20260409")
        it_only    : True면 IT 컨설팅 공고만, False면 용역 전체

    Returns:
        [
            {
                "bid": { ... },           # parse_bid() 결과
                "attachments": [ ... ]    # parse_attachments() 결과
            },
            ...
        ]
    """
    if not API_KEY:
        raise ValueError(".env에 NARA_API_KEY가 없습니다.")

    results = []
    seen = set()  # 중복 공고 제거용
    page = 1

    while True:
        params = {
            "serviceKey": API_KEY,
            "numOfRows": 100,
            "pageNo": page,
            "inqryDiv": 1,
            "inqryBgnDt": start_date + "0000",
            "inqryEndDt": end_date + "2359",
            "type": "json",
        }

        try:
            resp = requests.get(BID_LIST_URL, params=params, timeout=15)
            resp.raise_for_status()
        except requests.RequestException as e:
            raise RuntimeError(f"API 호출 실패 (page {page}): {e}")

        body = resp.json().get("response", {}).get("body", {})
        total_count = int(body.get("totalCount", 0))
        items = body.get("items", [])

        # 단건일 때 dict로 오는 API 특성 대응
        if isinstance(items, dict):
            items = [items]
        if not items:
            break

        for item in items:
            ntce_no = item.get("bidNtceNo", "")
            if ntce_no in seen:  # 중복 제거
                continue
            if not _is_service_bid(item):  # 물품/공사 제외
                continue
            if "취소" in item.get("ntceKindNm", ""):  # 취소공고 제외
                continue
            if it_only and not _is_it_consulting(item):  # IT 필터
                continue
            seen.add(ntce_no)
            results.append(
                {
                    "bid": parse_bid(item),
                    "attachments": parse_attachments(item),
                }
            )

        if page * 100 >= total_count:
            break
        page += 1

    return results
