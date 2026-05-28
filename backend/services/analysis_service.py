import asyncio
import logging
import time as _time
from datetime import datetime

import httpx
from google import genai
from google.genai import errors as genai_errors
from google.genai import types
from sqlalchemy import func, select

from backend.config import get_settings
from backend.db.crud import upsert_analysis
from backend.db.models import Attachment, Notice
from backend.prompts.rfp_analysis import SYSTEM_PROMPT, build_analysis_prompt
from backend.services import progress_store

logger = logging.getLogger(__name__)


def _get_client():
    settings = get_settings()
    return genai.Client(api_key=settings.gemini_api_key)


def _parse_json_response(text: str) -> dict:
    """Gemini 응답에서 JSON 추출 (```json ... ``` 블록 또는 순수 JSON)"""
    import json

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


def _to_int(val):
    if val is None:
        return None
    try:
        return int(float(str(val)))
    except (ValueError, TypeError):
        return None


def _to_datetime(val):
    if val is None or not isinstance(val, str):
        return None
    for fmt in ("%Y-%m-%dT%H:%M:%S", "%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M", "%Y-%m-%d"):
        try:
            return datetime.strptime(val, fmt)
        except ValueError:
            continue
    return None


async def analyze_rfp(notice_id: int, db) -> dict:
    """공고 첨부파일 → Gemini 호출 → 분석 결과 파싱 → analysis_results 저장.

    db: SQLAlchemy AsyncSession (백그라운드 작업은 자체 세션을 생성해 전달).
    독소조항은 analysis_results.poison_clauses(JSONB)에 통째로 저장한다.
    """
    settings = get_settings()

    # 0. e-발주 첨부 보강
    # collector는 ntceSpecDocUrl(입찰공고서/공고문)만 받아오므로 제안요청서·과업지시서가 누락된다.
    # AI 분석에서 requirements / eval_criteria를 제대로 추출하려면 e-발주 API(20번)로 보강.
    from backend.collector.file_downloader import download_attachments
    from backend.services.g2b_service import fetch_eorder_attachments, save_eorder_attachments

    notice_row = (await db.execute(
        select(Notice.bid_ntce_no, Notice.bid_ntce_dt).where(Notice.id == notice_id)
    )).first()
    if notice_row:
        bid_ntce_no_value, bid_ntce_dt_value = notice_row
        dt_str = bid_ntce_dt_value.strftime("%Y%m%d") if bid_ntce_dt_value else ""
        progress_store.emit(notice_id, "e-발주 제안요청서·과업지시서 조회")
        try:
            eorder_atts = await fetch_eorder_attachments(bid_ntce_no_value, dt_str)
            if eorder_atts:
                # file_downloader.download_attachments는 sync(requests) → 스레드로 분리
                downloaded = await asyncio.to_thread(download_attachments, eorder_atts)
                added = await save_eorder_attachments(db, notice_id, downloaded)
                if added:
                    progress_store.emit(notice_id, f"e-발주 첨부 추가: {added}건", level="success")
                else:
                    progress_store.emit(notice_id, "e-발주 첨부 — 모두 이미 존재")
            else:
                progress_store.emit(notice_id, "e-발주 첨부 없음")
        except Exception as e:  # noqa: BLE001
            progress_store.emit(notice_id, f"e-발주 조회 실패: {str(e)[:80]}", level="warning")
            logger.warning(f"e-발주 첨부 조회 실패 (notice_id={notice_id}): {e}")

    # 1. 첨부파일 로드 (PDF는 바이트 직접 전송, HWP는 변환 후 텍스트)
    pdf_atts = (
        await db.execute(
            select(Attachment).where(
                Attachment.notice_id == notice_id,
                func.lower(Attachment.file_type) == "pdf",
            )
        )
    ).scalars().all()
    hwp_atts = (
        await db.execute(
            select(Attachment).where(
                Attachment.notice_id == notice_id,
                func.lower(Attachment.file_type).in_(["hwp", "hwpx"]),
            )
        )
    ).scalars().all()

    if not pdf_atts and not hwp_atts:
        raise ValueError("분석할 첨부파일이 없습니다")

    g2b_headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Referer": "https://www.g2b.go.kr/",
    }

    content_parts: list = []
    progress_store.emit(notice_id, f"분석 대상: PDF {len(pdf_atts)}건, HWP {len(hwp_atts)}건")

    import os
    from backend.services.hwp_service import convert_hwp

    async def _load_bytes(att, http) -> tuple[bytes | None, str]:
        """첨부 바이트 로드. 수집 시 다운로드한 local_path가 있으면 거기서 읽고, 없으면 G2B에서 받음."""
        if att.local_path and os.path.exists(att.local_path):
            try:
                with open(att.local_path, "rb") as f:
                    return f.read(), "로컬"
            except OSError:
                pass
        try:
            resp = await http.get(att.file_url, headers=g2b_headers)
            if resp.status_code == 200:
                return resp.content, "G2B"
        except Exception as e:  # noqa: BLE001
            logger.warning(f"G2B 다운로드 에러 ({att.file_name}): {e}")
        return None, "실패"

    async with httpx.AsyncClient(timeout=60, follow_redirects=True) as http:
        # PDF → 원본 바이트로 Gemini에 직접 전송
        for att in pdf_atts:
            data, source = await _load_bytes(att, http)
            if not data:
                progress_store.emit(notice_id, f"PDF 로드 실패: {att.file_name}", level="warning")
                continue
            content_parts.append(
                types.Part.from_bytes(data=data, mime_type="application/pdf")
            )
            progress_store.emit(notice_id, f"PDF 로드({source}): {att.file_name} ({len(data)//1024}KB)")
            logger.info(f"PDF 로드 완료({source}): {att.file_name} ({len(data)} bytes)")

        # HWP → 리브레AI 변환 후 텍스트로 전송 (변환 결과 캐시 컬럼이 없어 매 분석 시 변환)
        for att in hwp_atts:
            data, source = await _load_bytes(att, http)
            if not data:
                progress_store.emit(notice_id, f"HWP 로드 실패: {att.file_name}", level="warning")
                continue
            try:
                result = await convert_hwp(data, att.file_name)
                text = result.get("md", "")
                if text:
                    content_parts.append(f"[파일: {att.file_name}]\n{text}")
                    progress_store.emit(notice_id, f"HWP 변환({source}→리브레AI): {att.file_name}")
                    logger.info(f"HWP 변환 완료({source}): {att.file_name}")
            except Exception as e:  # noqa: BLE001
                progress_store.emit(notice_id, f"HWP 변환 실패: {att.file_name}", level="warning")
                logger.warning(f"HWP 변환 실패 ({att.file_name}): {e}")

    if not content_parts:
        raise ValueError("분석 가능한 첨부파일이 없습니다")

    # 2. 분석 상태 = processing
    await upsert_analysis(db, notice_id, {"analysis_status": "processing"})

    # 3. Gemini 호출 (429/503 재시도 + fallback 모델)
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
                            logger.warning(f"Gemini 재시도 대기 {wait}초 (notice_id={notice_id}, model={model_name}, 시도 {attempt + 1}/3): {err_str[:50]}")
                            await asyncio.sleep(wait)
                        else:
                            raise
                if response is not None:
                    break
            except Exception as e:  # noqa: BLE001
                last_error = e
                if model_name != models_to_try[-1]:
                    progress_store.emit(notice_id, f"{model_name} 실패, fallback {models_to_try[-1]}로 전환", level="warning")
                    logger.warning(f"{model_name} 모든 재시도 실패, fallback 시도 (notice_id={notice_id}): {str(e)[:80]}")
                    response = None
                    continue
                raise

        if response is None:
            raise last_error or RuntimeError("Gemini 응답 없음")

        progress_store.emit(notice_id, "Gemini 응답 JSON 파싱")
        result = _parse_json_response(response.text)

    except Exception as e:  # noqa: BLE001
        progress_store.emit(notice_id, f"Gemini 분석 실패: {str(e)[:120]}", level="error")
        logger.error(f"Gemini 분석 실패 (notice_id={notice_id}): {e}", exc_info=True)
        await upsert_analysis(db, notice_id, {"analysis_status": "failed"})
        raise

    # 4. DB 저장 (analysis_results)
    basic = result.get("basic_info", {})
    poison = result.get("poison_clauses", {})

    await upsert_analysis(db, notice_id, {
        "project_type": basic.get("project_type"),
        "estimated_price": _to_int(basic.get("estimated_price")),
        "allocated_budget": _to_int(basic.get("allocated_budget")),
        "project_duration": basic.get("project_duration"),
        "contract_method": basic.get("contract_method"),
        "submit_deadline": _to_datetime(basic.get("deadline")),
        "risk_level": poison.get("risk_level", "safe"),
        "issuing_org": basic.get("issuing_org"),
        "project_summary": basic.get("project_summary"),
        "project_scope": basic.get("project_scope"),
        "qualification": result.get("qualification"),
        "eval_criteria": result.get("eval_criteria", []),
        "requirements": result.get("requirements", {}),
        "tech_requirements": result.get("tech_requirements", []),
        "poison_clauses": poison,
        "raw_analysis": result,
        "model_used": actual_model,
        "analysis_status": "completed",
        "analyzed_at": datetime.now(),
    })

    progress_store.emit(notice_id, f"DB 저장 완료 (위험도={poison.get('risk_level', 'safe')})", level="success")
    logger.info(f"RFP 분석 완료: notice_id={notice_id}, risk_level={poison.get('risk_level')}")
    return result


# 제안목차 생성은 services/outline_service.py 로 이동.
