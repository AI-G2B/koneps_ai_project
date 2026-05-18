import asyncio
import json
import logging
from datetime import datetime, timezone

import httpx
from google import genai
from google.genai import errors as genai_errors
from google.genai import types
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.config import get_settings
from backend.db.crud import create_risk_factors, upsert_analysis
from backend.db.models import Attachment, RiskFactor
from backend.prompts.rfp_analysis import SYSTEM_PROMPT, build_analysis_prompt
from backend.services import progress_store

logger = logging.getLogger(__name__)


def _get_client():
    settings = get_settings()
    return genai.Client(api_key=settings.gemini_api_key)


def _parse_json_response(text: str) -> dict:
    """Gemini 응답에서 JSON 추출 (```json ... ``` 블록 또는 순수 JSON)"""
    text = text.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        json_lines = []
        inside = False
        for line in lines:
            if line.strip().startswith("```") and not inside:
                inside = True
                continue
            elif line.strip() == "```" and inside:
                break
            elif inside:
                json_lines.append(line)
        text = "\n".join(json_lines)
    return json.loads(text)


def _to_float(val) -> float | None:
    if val is None:
        return None
    try:
        return float(str(val).replace(",", ""))
    except (ValueError, TypeError):
        return None


def _to_datetime(val) -> datetime | None:
    if val is None:
        return None
    if isinstance(val, str):
        for fmt in ("%Y-%m-%dT%H:%M:%S", "%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M", "%Y-%m-%d"):
            try:
                return datetime.strptime(val, fmt).replace(tzinfo=timezone.utc)
            except ValueError:
                continue
    return None


def _extract_score(eval_criteria: list, keyword: str) -> float | None:
    """평가항목 리스트에서 keyword를 포함하는 항목의 점수 합산"""
    total = 0.0
    found = False
    for item in eval_criteria:
        cat = (str(item.get("category", "")) + str(item.get("item", ""))).lower()
        if keyword in cat:
            score = item.get("score")
            if score is not None:
                try:
                    total += float(score)
                    found = True
                except (ValueError, TypeError):
                    pass
    return total if found else None


async def analyze_rfp(notice_id: int, db: AsyncSession) -> dict:
    """
    공고 첨부파일 텍스트를 로드 → Gemini 호출 → 분석 결과 파싱 →
    analysis_results + risk_factors 테이블에 저장.

    Args:
        notice_id: notices.id (PK)
        db:        SQLAlchemy AsyncSession

    Returns:
        Gemini 분석 결과 dict (raw JSON)
    """
    settings = get_settings()

    # 1. 첨부파일 조회 (SQLAlchemy ORM)
    rows = await db.execute(
        select(Attachment).where(Attachment.notice_id == notice_id)
    )
    attachments = rows.scalars().all()

    pdf_atts = [a for a in attachments if a.file_type.lower() == "pdf"]
    hwp_atts = [a for a in attachments if a.file_type.lower() in ("hwp", "hwpx")]

    if not pdf_atts and not hwp_atts:
        raise ValueError("분석할 첨부파일이 없습니다")

    g2b_headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Referer": "https://www.g2b.go.kr/",
    }

    content_parts = []
    progress_store.emit(notice_id, f"분석 대상: PDF {len(pdf_atts)}건, HWP {len(hwp_atts)}건")

    # PDF → 원본 바이트로 Gemini에 직접 전송
    for att in pdf_atts:
        try:
            async with httpx.AsyncClient(timeout=60, follow_redirects=True) as http:
                resp = await http.get(att.file_url, headers=g2b_headers)
                if resp.status_code == 200:
                    content_parts.append(types.Part.from_bytes(
                        data=resp.content,
                        mime_type="application/pdf",
                    ))
                    progress_store.emit(notice_id, f"PDF 다운로드: {att.file_name} ({len(resp.content) // 1024}KB)")
                    logger.info(f"PDF 다운로드 완료: {att.file_name} ({len(resp.content)} bytes)")
                else:
                    progress_store.emit(notice_id, f"PDF 다운로드 실패 (HTTP {resp.status_code}): {att.file_name}", level="warning")
        except Exception as e:
            progress_store.emit(notice_id, f"PDF 다운로드 실패: {att.file_name}", level="warning")
            logger.warning(f"PDF 다운로드 에러 ({att.file_name}): {e}")

    # HWP → 리브레AI 변환 후 텍스트로 전송
    from backend.services.hwp_service import download_and_convert
    for att in hwp_atts:
        try:
            conv = await download_and_convert(att.file_url, att.file_name)
            text = conv.get("md", "")
            if text:
                content_parts.append(f"[파일: {att.file_name}]\n{text}")
                progress_store.emit(notice_id, f"HWP 변환 완료: {att.file_name}")
                logger.info(f"HWP 변환 완료: {att.file_name}")
        except Exception as e:
            progress_store.emit(notice_id, f"HWP 변환 실패: {att.file_name}", level="warning")
            logger.warning(f"HWP 변환 실패 ({att.file_name}): {e}")

    if not content_parts:
        raise ValueError("분석 가능한 첨부파일이 없습니다")

    # 2. Gemini 호출 (429/503 재시도 + fallback 모델)
    import time as _time
    try:
        client = _get_client()
        prompt_text = build_analysis_prompt("")
        contents = content_parts + [prompt_text]

        gen_config = {
            "system_instruction": SYSTEM_PROMPT,
            "response_mime_type": "application/json",
            "temperature": 0.1,
        }

        models_to_try = [settings.gemini_model]
        if settings.gemini_fallback_model and settings.gemini_fallback_model != settings.gemini_model:
            models_to_try.append(settings.gemini_fallback_model)

        response = None
        actual_model = None
        last_error: Exception | None = None

        for model_name in models_to_try:
            progress_store.emit(notice_id, f"Gemini 호출 시작 (model={model_name})")
            _t0 = _time.monotonic()
            try:
                for attempt in range(3):
                    try:
                        response = await asyncio.to_thread(
                            client.models.generate_content,
                            model=model_name,
                            contents=contents,
                            config=gen_config,
                        )
                        actual_model = model_name
                        elapsed = _time.monotonic() - _t0
                        progress_store.emit(notice_id, f"Gemini 응답 수신 ({elapsed:.1f}초, model={model_name})", level="success")
                        logger.info(f"Gemini 응답 성공: model={model_name} (notice_id={notice_id})")
                        break
                    except (genai_errors.ClientError, genai_errors.ServerError) as e:
                        err_str = str(e)
                        if ("429" in err_str or "503" in err_str) and attempt < 2:
                            wait = 20 * (attempt + 1)
                            progress_store.emit(notice_id, f"재시도 대기 {wait}초 (시도 {attempt + 1}/3)", level="warning")
                            logger.warning(f"Gemini 재시도 {wait}초 대기 (notice_id={notice_id}, 시도 {attempt + 1}/3): {err_str[:50]}")
                            await asyncio.sleep(wait)
                        else:
                            raise
                if response is not None:
                    break
            except Exception as e:
                last_error = e
                if model_name != models_to_try[-1]:
                    progress_store.emit(notice_id, f"{model_name} 실패, fallback {models_to_try[-1]}로 전환", level="warning")
                    logger.warning(f"{model_name} 모든 재시도 실패, fallback 시도 (notice_id={notice_id}): {str(e)[:80]}")
                    response = None
                    continue
                else:
                    raise

        if response is None:
            raise last_error or RuntimeError("Gemini 응답 없음")

        progress_store.emit(notice_id, "Gemini 응답 JSON 파싱")
        parsed = _parse_json_response(response.text)

    except Exception as e:
        progress_store.emit(notice_id, f"Gemini 분석 실패: {str(e)[:120]}", level="error")
        logger.error(f"Gemini 분석 실패 (notice_id={notice_id}): {e}", exc_info=True)
        raise

    # 3. analysis_results 저장 (Gemini 응답 → DB 필드 매핑)
    basic = parsed.get("basic_info", {})
    poison = parsed.get("poison_clauses", {})
    eval_criteria = parsed.get("eval_criteria", [])
    tech_reqs = parsed.get("tech_requirements", [])

    analysis_data = {
        "budget_amt": _to_float(basic.get("allocated_budget") or basic.get("estimated_price")),
        "budget_raw": str(basic.get("allocated_budget") or basic.get("estimated_price") or ""),
        "bid_qualify": parsed.get("qualification"),
        "exec_period_raw": basic.get("project_duration"),
        "task_scope": basic.get("project_scope"),
        "eval_tech_score": _extract_score(eval_criteria, "기술"),
        "eval_price_score": _extract_score(eval_criteria, "가격"),
        "submit_deadline": _to_datetime(basic.get("deadline")),
        "required_docs": parsed.get("requirements") or None,
        "key_tech_spec": ", ".join(tech_reqs) if tech_reqs else None,
        "model_used": actual_model,
        "analyzed_at": datetime.now(timezone.utc),
    }

    await upsert_analysis(db, notice_id, analysis_data)
    progress_store.emit(notice_id, "analysis_results 저장 완료")

    # 4. risk_factors 저장 (기존 항목 삭제 후 재삽입)
    await db.execute(delete(RiskFactor).where(RiskFactor.notice_id == notice_id))
    await db.commit()

    risk_items = poison.get("items", [])
    if risk_items:
        factors = [
            {
                "risk_category": item.get("category", "OTHER"),
                "risk_level": item.get("severity", "caution"),
                "clause_title": item.get("category"),
                "clause_original": item.get("clause"),
                "clause_summary": item.get("reason", ""),
                "page_no": None,
                "mitigation_suggest": None,
                "sort_order": i,
            }
            for i, item in enumerate(risk_items)
        ]
        await create_risk_factors(db, notice_id, factors)

    risk_level = poison.get("risk_level", "safe")
    progress_store.emit(notice_id, f"DB 저장 완료 (위험도={risk_level}, 독소조항={len(risk_items)}건)", level="success")
    logger.info(f"RFP 분석 완료: notice_id={notice_id}, risk_level={risk_level}")
    return parsed


# 제안목차 생성은 services/outline_service.py 로 이동.
