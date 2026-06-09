"""RFP 요구사항 섹션 추출 — 앵커 식별(LLM) + fuzzy 슬라이스(code).

흐름:
  1. is_rfp=True 첨부의 converted_md를 모아 합본 텍스트 생성
  2. Gemini에 앵커(시작·끝 phrase) 식별 요청 → JSON
  3. 각 앵커를 converted_md에서 fuzzy 매치로 위치 산출
  4. 시작·끝 사이를 슬라이스해 verbatim 텍스트 반환 (원본의 부분문자열이므로 100% verbatim)

LLM이 인용한 phrase가 원문과 공백·줄바꿈에서 미세히 다를 수 있어
정규화 매치 → 정규화 위치를 원본 위치로 역산하는 헬퍼를 둔다.
"""
from __future__ import annotations

import json
import logging
import re
from dataclasses import dataclass

from backend.db.models import Attachment
from backend.prompts.rfp_section import build_section_anchor_prompt_dynamic
from backend.services import progress_store
from backend.services.extract import ensure_converted_md
from backend.services.llm import LLMError, LLMRequest, call_with_fallback
from backend.services.llm_config_store import get_active_config
from backend.services.prompt_store import get_prompt

logger = logging.getLogger(__name__)


@dataclass
class _Section:
    title: str
    start_anchor: str
    end_anchor: str


# ---------------------------------------------------------------------------
# Fuzzy anchor match
# ---------------------------------------------------------------------------


_WS_RE = re.compile(r"\s+")


def _normalize_and_map(text: str) -> tuple[str, list[int]]:
    """공백을 단일 ' '로 압축한 정규화 문자열 + 원본 위치 역매핑 인덱스를 반환.

    norm[i] 의 원본 위치 = mapping[i].
    """
    norm_chars: list[str] = []
    mapping: list[int] = []
    prev_ws = False
    for i, ch in enumerate(text):
        if ch.isspace():
            if not prev_ws and norm_chars:  # 연속 공백 → 단일 ' '
                norm_chars.append(" ")
                mapping.append(i)
            prev_ws = True
        else:
            norm_chars.append(ch)
            mapping.append(i)
            prev_ws = False
    return "".join(norm_chars), mapping


def fuzzy_find(text: str, anchor: str) -> int:
    """원본 text에서 anchor 시작 위치(0-based). 못 찾으면 -1.

    1차 정확 매치 → 2차 공백 정규화 매치 → 정규화 위치를 원본 위치로 역산.
    """
    if not anchor:
        return -1
    idx = text.find(anchor)
    if idx >= 0:
        return idx
    norm_text, mapping = _normalize_and_map(text)
    norm_anchor = _WS_RE.sub(" ", anchor).strip()
    if not norm_anchor:
        return -1
    norm_idx = norm_text.find(norm_anchor)
    if norm_idx < 0:
        return -1
    return mapping[norm_idx]


def fuzzy_find_end(text: str, anchor: str) -> int:
    """원본 text에서 anchor 끝 위치(exclusive). 못 찾으면 -1."""
    if not anchor:
        return -1
    idx = text.find(anchor)
    if idx >= 0:
        return idx + len(anchor)
    norm_text, mapping = _normalize_and_map(text)
    norm_anchor = _WS_RE.sub(" ", anchor).strip()
    if not norm_anchor:
        return -1
    norm_idx = norm_text.find(norm_anchor)
    if norm_idx < 0:
        return -1
    last_norm = norm_idx + len(norm_anchor) - 1
    if last_norm >= len(mapping):
        return -1
    return mapping[last_norm] + 1


# ---------------------------------------------------------------------------
# LLM call
# ---------------------------------------------------------------------------


def _parse_json(raw: str) -> dict:
    raw = raw.strip()
    if raw.startswith("```"):
        lines = raw.split("\n")
        inside = False
        body: list[str] = []
        for line in lines:
            if line.strip().startswith("```") and not inside:
                inside = True
                continue
            if line.strip() == "```" and inside:
                break
            if inside:
                body.append(line)
        raw = "\n".join(body)
    return json.loads(raw)


async def _call_anchor_llm(rfp_text: str, notice_id: int | None, db) -> list[_Section]:
    prompt = await build_section_anchor_prompt_dynamic(rfp_text, db)
    system_instruction = await get_prompt("rfp_section.system", db)
    llm_cfg = await get_active_config(db)
    request = LLMRequest(
        system=system_instruction,
        user_text=prompt,
        model=llm_cfg.model,
        temperature=llm_cfg.temperature,
        response_json=True,
    )

    # 앵커 식별은 단순 추출이라 응답 짧음 — 90초 한도면 충분.
    ANCHOR_LLM_TIMEOUT = 90
    on_progress = None
    if notice_id is not None:
        on_progress = lambda msg, lvl: progress_store.emit(notice_id, f"앵커: {msg}", level=lvl)

    try:
        response = await call_with_fallback(
            llm_cfg,
            request,
            timeout=ANCHOR_LLM_TIMEOUT,
            on_progress=on_progress,
        )
    except LLMError as e:
        raise RuntimeError(f"앵커 LLM 호출 실패: {e}") from e

    data = _parse_json(response.text)
    sections_raw = data.get("sections") or []
    sections: list[_Section] = []
    for s in sections_raw:
        if not isinstance(s, dict):
            continue
        start = (s.get("start_anchor") or "").strip()
        end = (s.get("end_anchor") or "").strip()
        if not start or not end:
            continue
        sections.append(
            _Section(
                title=(s.get("title") or "").strip(),
                start_anchor=start,
                end_anchor=end,
            )
        )
    return sections


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


_FILE_SEP_FMT = "\n\n---\n# 파일: {name}\n---\n\n"


async def build_rfp_text_from_attachments(
    rfp_atts: list[Attachment], db, notice_id: int | None = None
) -> str:
    """is_rfp 첨부들의 converted_md를 보장 채우고 합본 텍스트 반환.

    converted_md가 없는 첨부는 ensure_converted_md로 즉석 추출 + 캐시.
    """
    import httpx

    parts: list[str] = []
    async with httpx.AsyncClient(timeout=60, follow_redirects=True) as http:
        for att in rfp_atts:
            try:
                md = await ensure_converted_md(att, db, http=http)
            except Exception as e:  # noqa: BLE001
                logger.warning(f"RFP 첨부 변환 실패 ({att.file_name}): {e}")
                if notice_id is not None:
                    progress_store.emit(
                        notice_id,
                        f"RFP 첨부 변환 실패: {att.file_name}",
                        level="warning",
                    )
                continue
            if not md:
                continue
            parts.append(_FILE_SEP_FMT.format(name=att.file_name) + md)
    return "".join(parts).strip()


async def extract_requirements_section(
    rfp_text: str, db, notice_id: int | None = None
) -> str:
    """RFP 합본 텍스트에서 요구사항 섹션만 추출(verbatim).

    - LLM이 앵커만 반환 → 코드가 fuzzy 매치로 슬라이스 → 원본 부분문자열 보장.
    - 앵커 식별 실패 또는 매치 실패 시: rfp_text 전체를 그대로 반환(fallback).

    Returns:
        verbatim 요구사항 텍스트.
    """
    if not rfp_text.strip():
        return ""

    try:
        sections = await _call_anchor_llm(rfp_text, notice_id, db)
    except Exception as e:  # noqa: BLE001
        logger.warning(f"앵커 LLM 실패: {e}")
        if notice_id is not None:
            progress_store.emit(
                notice_id,
                f"앵커 LLM 실패 — 원문 전체 사용 ({str(e)[:80]})",
                level="warning",
            )
        return rfp_text

    if not sections:
        if notice_id is not None:
            progress_store.emit(
                notice_id,
                "요구사항 섹션 식별 못함 — 원문 전체 사용",
                level="warning",
            )
        return rfp_text

    chunks: list[str] = []
    skipped = 0
    for sec in sections:
        start = fuzzy_find(rfp_text, sec.start_anchor)
        end = fuzzy_find_end(rfp_text, sec.end_anchor)
        if start < 0 or end < 0 or end <= start:
            skipped += 1
            logger.warning(
                f"앵커 매치 실패 (title={sec.title}, start={start}, end={end})"
            )
            continue
        header = f"# {sec.title}\n\n" if sec.title else ""
        chunks.append(header + rfp_text[start:end])

    if not chunks:
        if notice_id is not None:
            progress_store.emit(
                notice_id,
                "앵커 매치 모두 실패 — 원문 전체 사용",
                level="warning",
            )
        return rfp_text

    if notice_id is not None and skipped:
        progress_store.emit(
            notice_id,
            f"앵커 일부 매치 실패: {skipped}/{len(sections)}건 누락",
            level="warning",
        )

    return "\n\n---\n\n".join(chunks)
