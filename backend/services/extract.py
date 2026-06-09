"""첨부파일 → 텍스트 변환 + DB 캐시.

PDF는 pypdf로 추출, HWP/HWPX는 LibreAI(`hwp_service.convert_hwp`)로 변환.
변환 결과는 `attachments.converted_md` 컬럼에 영속 저장하여 재분석·제안목차 생성 시 재변환을 회피한다.

PDF 분석 자체는 여전히 PDF 바이트를 Gemini에 직접 전송(네이티브 멀티모달).
converted_md는 "원문 텍스트가 필요한 곳"(원문 표시·앵커 추출 등)에서 사용한다.
"""
from __future__ import annotations

import asyncio
import io
import logging
import os
import re
from datetime import datetime, timezone

import httpx
from bs4 import BeautifulSoup, NavigableString

from backend.db.models import Attachment
from backend.services.hwp_service import convert_hwp

logger = logging.getLogger(__name__)

_G2B_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Referer": "https://www.g2b.go.kr/",
}


# ---------------------------------------------------------------------------
# LibreAI HWP 변환본 정리 — <table> HTML을 가독성 좋은 마크다운으로 변환.
# RFP 원문 표시·앵커 슬라이스 결과가 HTML 태그로 오염되지 않게 한다.
# ---------------------------------------------------------------------------


def _cell_text(cell) -> str:
    """<td>/<th>의 내부 텍스트만 추출. 줄바꿈은 보존하되 양 끝 공백 정리."""
    # 자식 노드를 순회하며 텍스트 합치기 (BR은 줄바꿈으로)
    parts: list[str] = []
    for node in cell.descendants:
        if node.name == "br":
            parts.append("\n")
        elif isinstance(node, NavigableString):
            parts.append(str(node))
    text = "".join(parts)
    # 마크다운 강조(**bold**)는 셀 안에서는 제거 — 표 안 가독성 우선
    text = re.sub(r"\*\*(.+?)\*\*", r"\1", text)
    # 다중 공백/줄바꿈 정리
    lines = [ln.strip() for ln in text.splitlines()]
    lines = [ln for ln in lines if ln]
    return " / ".join(lines) if len(lines) > 1 else (lines[0] if lines else "")


def _table_to_markdown(table) -> str:
    """단일 <table>을 마크다운 표 1개 또는 key-value 라인으로 변환.

    - 2 컬럼이고 첫 컬럼이 라벨 같은 표 → "라벨: 값" 라인들
    - 그 외 → 마크다운 파이프 표 (첫 행을 헤더로)
    """
    rows: list[list[str]] = []
    max_cols = 0
    for tr in table.find_all("tr"):
        cells = tr.find_all(["td", "th"])
        if not cells:
            continue
        # colspan은 무시하고 각 <td>를 단일 셀로 — 빈 패딩 컬럼을 만들지 않아 표가 깔끔.
        row: list[str] = [_cell_text(c) for c in cells]
        rows.append(row)
        if len(row) > max_cols:
            max_cols = len(row)

    if not rows:
        return ""

    # 모든 셀이 비었으면 skip
    if not any(any(c.strip() for c in r) for r in rows):
        return ""

    # 2컬럼 표 + 라벨 패턴 → key-value 라인
    if max_cols == 2 and len(rows) > 1:
        lines = []
        for r in rows:
            if len(r) >= 2:
                k, v = r[0], r[1]
                if k or v:
                    lines.append(f"- **{k}**: {v}" if k else f"- {v}")
            elif r and r[0].strip():
                lines.append(f"- {r[0]}")
        if lines:
            return "\n".join(lines)

    # 일반 마크다운 표 — colspan/rowspan 영향으로 row마다 셀 수가 다를 수 있음.
    # rows에서 max width를 다시 계산하고 끝에 빈 셀로만 채워지는 trailing 컬럼은 제거.
    width = max(len(r) for r in rows)
    norm_rows = [r + [""] * (width - len(r)) for r in rows]
    # 마지막 컬럼이 전부 빈 문자열이면 컬럼 자체를 제거 (반복)
    while width > 1 and all(r[-1] == "" for r in norm_rows):
        for r in norm_rows:
            r.pop()
        width -= 1
    # 셀 내부 줄바꿈은 표가 깨지므로 " / " 로 압축
    norm_rows = [[c.replace("\n", " / ") for c in r] for r in norm_rows]
    header = norm_rows[0]
    body = norm_rows[1:]
    sep = ["---"] * width
    lines = ["| " + " | ".join(header) + " |", "| " + " | ".join(sep) + " |"]
    for r in body:
        lines.append("| " + " | ".join(r) + " |")
    return "\n".join(lines)


def _normalize_libreai_md(md: str) -> str:
    """LibreAI markdown 안의 <table> 블록을 가독성 마크다운으로 치환."""
    if "<table" not in md:
        return md
    soup = BeautifulSoup(md, "html.parser")
    for table in soup.find_all("table"):
        replacement = _table_to_markdown(table)
        # 빈 표는 통째로 제거
        new_node = NavigableString("\n\n" + replacement + "\n\n") if replacement else NavigableString("")
        table.replace_with(new_node)
    text = str(soup)
    # 과도한 빈 줄 압축
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


async def load_attachment_bytes(
    att: Attachment, http: httpx.AsyncClient | None = None
) -> tuple[bytes | None, str]:
    """첨부 바이트 로드.

    수집 시 다운로드한 local_path가 있으면 거기서, 없으면 G2B URL에서 받는다.
    Returns: (bytes | None, source) — source ∈ {'로컬', 'G2B', '실패'}.
    """
    if att.local_path and os.path.exists(att.local_path):
        try:
            with open(att.local_path, "rb") as f:
                return f.read(), "로컬"
        except OSError:
            pass

    async def _fetch(client: httpx.AsyncClient) -> tuple[bytes | None, str]:
        try:
            resp = await client.get(att.file_url, headers=_G2B_HEADERS)
            if resp.status_code == 200:
                return resp.content, "G2B"
        except Exception as e:  # noqa: BLE001
            logger.warning(f"G2B 다운로드 실패 ({att.file_name}): {e}")
        return None, "실패"

    if http is not None:
        return await _fetch(http)
    async with httpx.AsyncClient(timeout=60, follow_redirects=True) as client:
        return await _fetch(client)


def extract_pdf_text(data: bytes) -> str:
    """pypdf로 PDF 텍스트 추출. 페이지 사이는 빈 줄로 구분.

    스캔본·이미지 PDF는 빈 문자열 반환. 표·복잡 레이아웃은 일부 깨질 수 있음 —
    여기서 만든 텍스트는 "원문 표시·앵커 추출" 용이지 분석 입력은 아니다.
    분석 입력은 별도로 PDF 바이트를 Gemini에 직접 전송한다.
    """
    from pypdf import PdfReader

    pages: list[str] = []
    reader = PdfReader(io.BytesIO(data))
    for page in reader.pages:
        try:
            txt = page.extract_text() or ""
        except Exception as e:  # noqa: BLE001
            logger.warning(f"pypdf 페이지 추출 실패: {e}")
            txt = ""
        if txt.strip():
            pages.append(txt.strip())
    # NULL byte / 기타 제어문자 제거 — Postgres TEXT 컬럼에 \x00 저장 불가.
    # pypdf가 일부 PDF에서 \x00 같은 제어문자를 추출본에 포함시키는 케이스 방어.
    result = "\n\n".join(pages)
    return _strip_control_chars(result)


_CONTROL_CHAR_RE = re.compile(r"[\x00-\x08\x0b-\x0c\x0e-\x1f\x7f]")


def _strip_control_chars(text: str) -> str:
    """\\x00 같은 제어문자 제거. \\n(0x0a), \\r(0x0d), \\t(0x09)는 보존."""
    if not text:
        return text
    return _CONTROL_CHAR_RE.sub("", text)


async def ensure_converted_md(
    att: Attachment,
    db,
    *,
    http: httpx.AsyncClient | None = None,
    data: bytes | None = None,
) -> str | None:
    """첨부의 변환 텍스트를 보장 반환.

    - 이미 `converted_md`가 있으면 그대로 반환 (DB hit — 변환 0회).
    - 없으면 PDF는 pypdf, HWP/HWPX는 LibreAI로 변환 후 DB에 commit.
    - 변환 실패·지원되지 않는 형식 → None 반환 (DB 저장 안 함).

    Args:
        att:  Attachment row (db 세션에 attached 상태)
        db:   AsyncSession
        http: 선택 — 외부 HTTP 클라이언트 (배치 호출 시 공유)
        data: 선택 — 이미 로드된 바이트 (재로드 회피)

    Returns:
        변환 텍스트 또는 None.
    """
    if att.converted_md:
        return att.converted_md

    file_type = (att.file_type or "").lower()
    if file_type not in ("pdf", "hwp", "hwpx"):
        return None

    if data is None:
        data, _ = await load_attachment_bytes(att, http=http)
    if not data:
        return None

    text: str = ""
    source: str = ""
    try:
        if file_type == "pdf":
            text = await asyncio.to_thread(extract_pdf_text, data)
            source = "pypdf"
        else:  # hwp / hwpx
            result = await convert_hwp(data, att.file_name)
            raw_md = (result.get("md") or "").strip()
            # LibreAI 출력의 <table> HTML을 마크다운 표/리스트로 정리.
            text = await asyncio.to_thread(_normalize_libreai_md, raw_md)
            source = "libreai"
    except Exception as e:  # noqa: BLE001
        logger.warning(f"변환 실패 ({att.file_name}, type={file_type}): {e}")
        return None

    # 모든 source에 대해 제어문자(특히 \x00) 정리 — Postgres TEXT 컬럼 저장 보호.
    text = _strip_control_chars(text)

    if not text:
        # 스캔본 PDF 등 — 빈 결과는 캐시에 저장하지 않음 (다음 호출에서 재시도 가능)
        return None

    att.converted_md = text
    att.converted_at = datetime.now(timezone.utc)
    att.conversion_source = source
    try:
        await db.commit()
        await db.refresh(att)
    except Exception as e:  # noqa: BLE001
        # commit 실패 시 세션 복구 — 후속 호출이 PendingRollbackError로 깨지지 않게.
        logger.error(f"converted_md commit 실패 ({att.file_name}): {e}")
        try:
            await db.rollback()
        except Exception:  # noqa: BLE001
            pass
        return text  # 메모리상으론 반환 (DB만 못 들어간 상태)
    return text
