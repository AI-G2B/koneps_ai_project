"""
나라장터 OpenAPI 공고 수집
담당: 최서원

흐름: 이 파일에서 API 호출 → 공고 목록 반환
→ 강주현 DB에 저장 → 강현묵 AI 분석
"""

import os
from pathlib import Path

import requests
from dotenv import load_dotenv

# uvicorn cwd가 어디든 프로젝트 루트의 .env를 절대경로로 로드. override=False로 쉘 export가 우선되게 (CORS_ORIGINS 같은 운영용 오버라이드 보장).
_ENV_PATH = Path(__file__).resolve().parents[2] / ".env"
load_dotenv(_ENV_PATH, override=False)

API_KEY = os.getenv("NARA_API_KEY", "")

# 전체 용역 공고 조회 — 업종코드 무관하게 ISP/ISMP 누락 방지
BID_LIST_URL = (
    "https://apis.data.go.kr/1230000/ad/BidPublicInfoService/getBidPblancListInfoServc"
)

# E발주(전자입찰) 첨부파일 조회 — 20번 API
EORDER_ATCH_FILE_URL = (
    "https://apis.data.go.kr/1230000/ad/BidPublicInfoService"
    "/getBidPblancListInfoEorderAtchFileInfo"
)

# 단독 키워드 — 공고명에 있으면 바로 포함 (업종코드 무관)
STANDALONE_KEYWORDS = [
    "ISP", "ISMP", "BPR",
    "정보화전략", "정보화계획", "디지털전환", "마스터플랜", "IT 컨설팅",
]

# 트리거 단어와 함께 있어야 걸리는 IT 키워드
CONSULTING_KEYWORDS = [
    "IT", "ICT", "SW", "AI", "인공지능",
    "정보", "디지털", "클라우드", "보안", "사이버",
    "시스템", "ERP", "데이터", "DX",
]

# 분류용 — ISMP 판별 (ISP보다 먼저 검사 — "ISMP"에 "ISP"가 포함됨)
ISMP_KEYWORDS = ["ISMP", "마스터플랜", "정보시스템마스터플랜"]

# 분류용 — ISP 판별
ISP_KEYWORDS = ["ISP", "정보화전략", "정보화계획"]

# 분류용 — BPR/PI 판별
BPR_PI_KEYWORDS = ["BPR", "PI"]

# 제안요청서 파일명 판별 키워드
_RFP_FILENAME_KEYWORDS = ["제안요청서", "RFP", "제안요청"]


# ──────────────────────────────────────
# 내부 필터 함수
# ──────────────────────────────────────


def _is_service_bid(item: dict) -> bool:
    """용역 공고인지 판별한다 — 물품·공사·시설 공고는 제외한다."""
    large = item.get("pubPrcrmntLrgClsfcNm", "")
    return not any(exc in large for exc in ["물품", "공사", "시설"])


def _safe_int(value: int | str | None) -> int | None:
    """문자열 또는 None을 안전하게 int로 변환한다. 변환 불가 시 None 반환."""
    try:
        return int(value) if value else None
    except (ValueError, TypeError):
        return None


def _is_it_consulting(item: dict) -> bool:
    """IT 컨설팅 공고인지 2단계 키워드 로직으로 판별한다."""
    name_lower = item.get("bidNtceNm", "").lower()

    # 1단계: 단독 키워드가 있으면 바로 포함
    if any(kw.lower() in name_lower for kw in STANDALONE_KEYWORDS):
        return True

    # 2단계: 트리거 단어 + IT 키워드 조합
    trigger = (
        "컨설팅" in name_lower
        or "계획 수립" in name_lower
        or "기본계획" in name_lower
    )
    if trigger and any(kw.lower() in name_lower for kw in CONSULTING_KEYWORDS):
        return True

    return False


def _classify_notice_type(bid_ntce_nm: str) -> tuple[str, bool, str | None]:
    """
    공고명을 분석하여 공고 유형을 분류한다.

    Returns:
        (notice_type, is_isp_ismp, isp_ismp_type)
        - notice_type  : "ISP" | "ISMP" | "BPR/PI" | "일반"
        - is_isp_ismp  : ISP 또는 ISMP 여부
        - isp_ismp_type: "ISP" | "ISMP" | None
    """
    name_lower = bid_ntce_nm.lower()

    # ISMP 판별 (ISP보다 먼저 검사 — "ISMP"에 "ISP"가 포함됨)
    if any(kw.lower() in name_lower for kw in ISMP_KEYWORDS):
        return "ISMP", True, "ISMP"

    # ISP 판별
    if any(kw.lower() in name_lower for kw in ISP_KEYWORDS):
        return "ISP", True, "ISP"

    # BPR/PI 판별
    if any(kw.lower() in name_lower for kw in BPR_PI_KEYWORDS):
        return "BPR/PI", False, None

    return "일반", False, None


# ──────────────────────────────────────
# 데이터 변환 함수
# ──────────────────────────────────────


def parse_bid(item: dict) -> dict:
    """API 응답 단건을 DB 저장용 딕셔너리로 변환한다."""
    bid_ntce_nm = item.get("bidNtceNm", "")
    notice_type, is_isp_ismp, isp_ismp_type = _classify_notice_type(bid_ntce_nm)

    return {
        "bid_ntce_no": item.get("bidNtceNo", ""),
        "bid_ntce_ord": item.get("bidNtceOrd", ""),  # 입찰공고차수 (재공고 판별)
        "bid_ntce_nm": bid_ntce_nm,
        "ntce_instt_nm": item.get("ntceInsttNm", ""),  # 공고기관명
        "dminstt_nm": item.get("dminsttNm", ""),  # 수요기관명
        "bid_clse_dt": item.get("bidClseDt", ""),  # 입찰마감일시 ★
        "bid_ntce_dt": item.get("bidNtceDt", ""),  # 입찰공고일시
        "openg_dt": item.get("opengDt", ""),  # 개찰일시
        "presmpt_prce": _safe_int(item.get("presmptPrce")),
        "asign_bdgt_amt": _safe_int(item.get("asignBdgtAmt")),
        "ntce_kind_nm": item.get("ntceKindNm", ""),  # 신규·정정·재공고·취소
        "cntrct_cncls_mthd_nm": item.get("cntrctCnclsMthdNm", ""),
        "pub_prcrmnt_lrg_clsfc_nm": item.get("pubPrcrmntLrgClsfcNm", ""),
        "pub_prcrmnt_clsfc_nm": item.get("pubPrcrmntClsfcNm", ""),
        "info_biz_yn": item.get("infoBizYn", ""),  # 정보화사업여부 Y/N
        "bid_ntce_dtl_url": item.get("bidNtceDtlUrl", ""),  # 공고 상세 URL
        "is_canceled": "취소" in item.get("ntceKindNm", ""),
        "is_corrected": "정정" in item.get("ntceKindNm", ""),
        "bid_mtd_nm": item.get("bidMethdNm", ""),  # 입찰방식명
        "notice_type": notice_type,
        "is_isp_ismp": is_isp_ismp,
        "isp_ismp_type": isp_ismp_type,
    }


def parse_attachments(item: dict) -> list[dict]:
    """API 응답에서 첨부파일 URL·이름을 파싱한다 (최대 10개)."""
    attachments = []
    for i in range(1, 11):
        url = item.get(f"ntceSpecDocUrl{i}", "")
        name = item.get(f"ntceSpecFileNm{i}", "")
        if url and name:
            ext = name.rsplit(".", 1)[-1].lower() if "." in name else "unknown"
            is_rfp = any(kw in name for kw in _RFP_FILENAME_KEYWORDS)
            attachments.append(
                {
                    "file_name": name,
                    "file_url": url,
                    "file_type": ext,
                    "is_rfp": is_rfp,
                    "parse_status": "pending",
                }
            )
    return attachments


def fetch_eorder_attachments(bid_ntce_no: str, bid_ntce_dt: str) -> list[dict]:
    """E발주 20번 API로 제안요청서 등 전자입찰 첨부파일을 조회한다.

    20번 API(getBidPblancListInfoEorderAtchFileInfo)는 bidNtceNo 직접 조회를
    지원하지 않으므로 공고일 기준 전체 조회 후 공고번호로 매칭한다.

    Args:
        bid_ntce_no: 입찰공고번호 (예: "20260501001")
        bid_ntce_dt: 공고 등록일시 문자열 (예: "2026-05-01 09:00:00")

    Returns:
        [{"file_name": ..., "file_url": ..., "file_type": ..., "is_rfp": True, ...}]
    """
    if not API_KEY or not bid_ntce_dt:
        return []

    # "2026-05-01 09:00:00" 또는 "202605010900" → YYYYMMDD 8자리 추출
    clean = bid_ntce_dt.replace("-", "").replace(" ", "").replace(":", "")
    date_ymd = clean[:8]
    if len(date_ymd) < 8 or not date_ymd.isdigit():
        return []

    base_params = {
        "serviceKey": API_KEY,
        "numOfRows": 100,
        "inqryDiv": 1,
        "inqryBgnDt": date_ymd + "0000",
        "inqryEndDt": date_ymd + "2359",
        "type": "json",
    }

    results: list[dict] = []
    page = 1

    while True:
        try:
            resp = requests.get(
                EORDER_ATCH_FILE_URL,
                params={**base_params, "pageNo": page},
                timeout=15,
            )
            resp.raise_for_status()
        except requests.RequestException:
            break

        body = resp.json().get("response", {}).get("body", {})
        total_count = int(body.get("totalCount", 0) or 0)
        items = body.get("items", [])

        if isinstance(items, dict):
            items = [items]
        if not items:
            break

        for item in items:
            if item.get("bidNtceNo", "") != bid_ntce_no:
                continue
            url = item.get("eorderAtchFileUrl", "")
            name = item.get("eorderAtchFileNm", "")
            if url and name:
                ext = name.rsplit(".", 1)[-1].lower() if "." in name else "unknown"
                # eorderDocDivNm이 "제안요청서"인 경우만 is_rfp=True
                is_rfp = item.get("eorderDocDivNm", "") == "제안요청서"
                results.append(
                    {
                        "file_name": name,
                        "file_url": url,
                        "file_type": ext,
                        "is_rfp": is_rfp,
                        "parse_status": "pending",
                    }
                )

        if page * 100 >= total_count:
            break
        page += 1

    return results


# ──────────────────────────────────────
# 핵심: API 호출
# ──────────────────────────────────────


def fetch_bids_by_query(query: str, limit: int = 20) -> list[dict]:
    """
    공고명 키워드로 나라장터 API를 검색한다.

    Args:
        query : 검색할 공고명 키워드
        limit : 최대 반환 건수

    Returns:
        [{"bid": {...}, "attachments": [...]}, ...]
    """
    if not API_KEY:
        raise ValueError(".env에 NARA_API_KEY가 없습니다.")

    params = {
        "serviceKey": API_KEY,
        "numOfRows": limit,
        "pageNo": 1,
        "inqryDiv": 1,
        "bidNtceNm": query,
        "type": "json",
    }

    try:
        resp = requests.get(BID_LIST_URL, params=params, timeout=15)
        resp.raise_for_status()
    except requests.RequestException as e:
        raise RuntimeError(f"API 호출 실패: {e}")

    body = resp.json().get("response", {}).get("body", {})
    items = body.get("items", [])

    if isinstance(items, dict):
        items = [items]
    if not items:
        return []

    results = []
    seen: set[str] = set()
    for item in items:
        ntce_no = item.get("bidNtceNo", "")
        if ntce_no in seen:
            continue
        if not _is_service_bid(item):
            continue
        if "취소" in item.get("ntceKindNm", ""):
            continue
        seen.add(ntce_no)
        results.append(
            {
                "bid": parse_bid(item),
                "attachments": parse_attachments(item),
            }
        )

    return results


def _fetch_all_pages(base_params: dict, seen: set[str]) -> list[dict]:
    """
    주어진 파라미터로 전체 페이지를 순회하며 공고를 수집한다.

    Args:
        base_params : pageNo를 제외한 공통 API 파라미터
        seen        : 이미 수집된 공고번호 집합 (중복 제거용, 호출자와 공유)
    """
    results = []
    page = 1

    while True:
        try:
            resp = requests.get(
                BID_LIST_URL, params={**base_params, "pageNo": page}, timeout=15
            )
            resp.raise_for_status()
        except requests.RequestException as e:
            raise RuntimeError(f"API 호출 실패 (page {page}): {e}")

        body = resp.json().get("response", {}).get("body", {})
        total_count = int(body.get("totalCount", 0))
        items = body.get("items", [])

        if isinstance(items, dict):
            items = [items]
        if not items:
            break

        for item in items:
            ntce_no = item.get("bidNtceNo", "")
            if ntce_no in seen:
                continue
            if not _is_service_bid(item):
                continue
            if "취소" in item.get("ntceKindNm", ""):
                continue
            if not _is_it_consulting(item):
                continue
            seen.add(ntce_no)
            results.append(
                {"bid": parse_bid(item), "attachments": parse_attachments(item)}
            )

        if page * 100 >= total_count:
            break
        page += 1

    return results


def fetch_bids(
    start_date: str,
    end_date: str,
    start_time: str = "0000",
    end_time: str = "2359",
) -> list[dict]:
    """
    나라장터 전체 용역 공고에서 IT 컨설팅 공고를 수집한다.

    수집 전략 (v3 — 전체 용역 검색, 키워드 필터):
      1. 업종코드 무관하게 전체 용역 공고 조회 — ISP/ISMP 누락 방지
      2. _is_it_consulting()으로 IT 컨설팅 공고 필터링
      3. _classify_notice_type()으로 ISP/ISMP/BPR-PI/일반 분류
      → 모호한 공고는 담당자가 직접 판단

    Args:
        start_date : 조회 시작일 YYYYMMDD (예: "20260401")
        end_date   : 조회 종료일 YYYYMMDD (예: "20260409")
        start_time : 조회 시작 시각 HHMM (기본 "0000")
        end_time   : 조회 종료 시각 HHMM (기본 "2359")

    Returns:
        [{"bid": {..., "notice_type": "ISP"|"ISMP"|"BPR/PI"|"일반"}, "attachments": [...]}, ...]

    Raises:
        ValueError: API 키 누락 시
        RuntimeError: API 호출 실패 시
    """
    if not API_KEY:
        raise ValueError(".env에 NARA_API_KEY가 없습니다.")

    base_params = {
        "serviceKey": API_KEY,
        "numOfRows": 100,
        "inqryDiv": 1,
        "inqryBgnDt": start_date + start_time,
        "inqryEndDt": end_date + end_time,
        "type": "json",
    }

    seen: set[str] = set()
    return _fetch_all_pages(base_params, seen)
