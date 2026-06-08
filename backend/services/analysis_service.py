import asyncio
import logging
from datetime import datetime

import httpx
from sqlalchemy import func, select

from backend.db.crud import upsert_analysis
from backend.db.models import Attachment, Notice
from backend.prompts.rfp_analysis import build_analysis_prompt_dynamic
from backend.prompts.rfp_analysis_general import build_general_analysis_prompt_dynamic
from backend.services.llm import FilePart, LLMError, LLMRequest, call_with_fallback
from backend.services.llm_config_store import get_active_config
from backend.services.prompt_store import get_prompt
from backend.services import progress_store

logger = logging.getLogger(__name__)


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

    # 0. e-발주 첨부 보강
    # collector는 ntceSpecDocUrl(입찰공고서/공고문)만 받아오므로 제안요청서·과업지시서가 누락된다.
    # AI 분석에서 requirements / eval_criteria를 제대로 추출하려면 e-발주 API(20번)로 보강.
    from backend.collector.file_downloader import download_attachments
    from backend.services.g2b_service import fetch_eorder_attachments, save_eorder_attachments

    notice_row = (await db.execute(
        select(Notice.bid_ntce_no, Notice.bid_ntce_dt, Notice.notice_type, Notice.isp_ismp_type).where(Notice.id == notice_id)
    )).first()
    notice_type_value: str | None = None
    isp_ismp_type_value: str | None = None
    if notice_row:
        bid_ntce_no_value, bid_ntce_dt_value, notice_type_value, isp_ismp_type_value = notice_row
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

    files: list[FilePart] = []
    progress_store.emit(notice_id, f"분석 대상: PDF {len(pdf_atts)}건, HWP {len(hwp_atts)}건")

    from backend.services.extract import ensure_converted_md, load_attachment_bytes

    async with httpx.AsyncClient(timeout=60, follow_redirects=True) as http:
        # PDF — bytes 그대로 + converted_md(pypdf 추출본) 두 표현 모두 동봉.
        # Gemini는 native multimodal(bytes), Claude는 32MB 내면 native 아니면 text 폴백, OpenAI는 항상 text.
        for att in pdf_atts:
            data, source = await load_attachment_bytes(att, http=http)
            if not data:
                progress_store.emit(notice_id, f"PDF 로드 실패: {att.file_name}", level="warning")
                continue
            try:
                pdf_text = await ensure_converted_md(att, db, http=http, data=data)
            except Exception as e:  # noqa: BLE001
                logger.warning(f"PDF 텍스트 캐시 실패 ({att.file_name}): {e}")
                pdf_text = None
            files.append(FilePart(
                file_name=att.file_name,
                mime_type="application/pdf",
                data=data,
                text=pdf_text,
            ))
            progress_store.emit(notice_id, f"PDF 로드({source}): {att.file_name} ({len(data)//1024}KB)")

        # HWP/HWPX — LibreAI 변환 텍스트만 동봉 (모든 provider가 텍스트로 처리).
        for att in hwp_atts:
            cache_hit = bool(att.converted_md)
            try:
                text = await ensure_converted_md(att, db, http=http)
            except Exception as e:  # noqa: BLE001
                progress_store.emit(notice_id, f"HWP 변환 실패: {att.file_name}", level="warning")
                logger.warning(f"HWP 변환 실패 ({att.file_name}): {e}")
                continue
            if not text:
                progress_store.emit(notice_id, f"HWP 로드/변환 실패: {att.file_name}", level="warning")
                continue
            files.append(FilePart(
                file_name=att.file_name,
                mime_type="text/markdown",
                text=text,
            ))
            label = "캐시" if cache_hit else "리브레AI"
            progress_store.emit(notice_id, f"HWP {label}: {att.file_name}")

    if not files:
        raise ValueError("분석 가능한 첨부파일이 없습니다")

    # 2. 분석 상태 = processing
    await upsert_analysis(db, notice_id, {"analysis_status": "processing"})

    # 3. LLM 호출 — provider 추상화 (Gemini/Claude/OpenAI). 활성 설정 기반.
    try:
        # ISP/ISMP 공고는 컨설팅 전용 프롬프트, 그 외(시스템 구축·유지관리·일반 용역 등)는 범용 프롬프트.
        is_isp_ismp = isp_ismp_type_value in ("ISP", "ISMP") or notice_type_value in ("ISP", "ISMP")
        if is_isp_ismp:
            system_instruction = await get_prompt("rfp_analysis.system", db)
            prompt_text = await build_analysis_prompt_dynamic("", db)
            prompt_kind = "ISP/ISMP"
        else:
            system_instruction = await get_prompt("rfp_analysis_general.system", db)
            prompt_text = await build_general_analysis_prompt_dynamic("", db)
            prompt_kind = "범용"
        progress_store.emit(notice_id, f"분석 프롬프트: {prompt_kind} (notice_type={notice_type_value})")

        llm_cfg = await get_active_config(db)
        request = LLMRequest(
            system=system_instruction,
            user_text=prompt_text,
            model=llm_cfg.model,
            temperature=llm_cfg.temperature,
            response_json=True,
            files=files,
        )

        # PDF 직접 전송 분석은 응답이 더 오래 걸릴 수 있어 outline보다 timeout을 길게.
        ANALYSIS_LLM_TIMEOUT = 240
        try:
            response = await call_with_fallback(
                llm_cfg,
                request,
                timeout=ANALYSIS_LLM_TIMEOUT,
                on_progress=lambda msg, lvl: progress_store.emit(notice_id, msg, level=lvl),
            )
        except LLMError as e:
            raise RuntimeError(f"LLM 호출 실패: {e}") from e

        progress_store.emit(notice_id, f"응답 JSON 파싱 (model={response.model_used})")
        result = _parse_json_response(response.text)
        actual_model = response.model_used

    except Exception as e:  # noqa: BLE001
        progress_store.emit(notice_id, f"LLM 분석 실패: {str(e)[:120]}", level="error")
        logger.error(f"LLM 분석 실패 (notice_id={notice_id}): {e}", exc_info=True)
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
