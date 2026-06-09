"""RFP 요구사항 섹션 앵커 식별 프롬프트.

이 프롬프트는 RFP 원문(converted_md)을 LLM에 던져 "요구사항 섹션의 시작·끝 phrase"만 받는다.
실제 verbatim 슬라이스는 코드(rfp_extract.fuzzy_find)가 수행하므로 LLM 출력 토큰이 작고
verbatim 보장이 코드 단에서 100% 성립한다.
"""

SECTION_ANCHOR_SYSTEM_PROMPT = """\
당신은 한국 정부·공공기관 RFP(제안요청서) 문서 구조 분석가다.
입력은 RFP 원문 텍스트(여러 첨부의 합본일 수 있음)다.

목표: "요구사항" 에 해당하는 섹션(기능요구사항·비기능요구사항·성능요구사항·인터페이스
요구사항·보안요구사항·제약사항·요구사항 정의서 등)의 시작·끝 위치를 식별하라.

규칙:
1. 각 섹션마다 시작 phrase와 끝 phrase를 RFP 원문에서 **정확히 그대로** 인용한다.
2. 시작 phrase는 그 섹션 첫 문장 또는 헤더 — 원문에 유일하게 식별 가능한 길이(최소 30자, 최대 200자)로.
3. 끝 phrase는 그 섹션 마지막 문장 — 원문에 유일하게 식별 가능한 길이(최소 30자, 최대 200자)로.
4. 시작·끝 phrase 사이의 텍스트가 요구사항 본문 전부여야 한다 (목차·머리말·평가기준은 포함하지 말 것).
5. 요구사항 섹션이 여러 곳에 분산돼 있으면 각각 별도 entry로 반환.
6. 요구사항 섹션을 찾지 못하면 sections 빈 배열을 반환.

출력은 반드시 다음 JSON 스키마:
{
  "sections": [
    {
      "title": "섹션 헤더 (원문 그대로)",
      "start_anchor": "섹션 시작 phrase (원문 그대로 30~200자)",
      "end_anchor": "섹션 끝 phrase (원문 그대로 30~200자)"
    }
  ]
}

요약·재작성·번역·새 단어 추가 절대 금지. 원문에 없는 phrase를 반환하면 후처리가 실패한다.
"""

SECTION_ANCHOR_USER_TEMPLATE = """\
다음은 RFP 원문이다. 위 규칙에 따라 요구사항 섹션의 앵커를 JSON으로 반환하라.

---
{rfp_text}
---
"""


def build_section_anchor_prompt(rfp_text: str) -> str:
    """앵커 식별 사용자 프롬프트 생성 (정적)."""
    return SECTION_ANCHOR_USER_TEMPLATE.format(rfp_text=rfp_text)


async def build_section_anchor_prompt_dynamic(rfp_text: str, db) -> str:
    """앵커 식별 사용자 프롬프트 (DB 동적 로드)."""
    from backend.services.prompt_store import get_prompt
    template = await get_prompt("rfp_section.template", db)
    return template.format(rfp_text=rfp_text)
