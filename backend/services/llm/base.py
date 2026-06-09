"""LLM provider 공통 인터페이스 + 데이터클래스.

LLMRequest는 단일 LLM 호출에 필요한 모든 정보를 담는다. provider별 SDK 차이는
어댑터 안에서 흡수한다.
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import ClassVar


@dataclass
class FilePart:
    """LLM 호출에 첨부되는 파일.

    - data: PDF 등 바이너리 (provider가 native 멀티모달 지원 시 사용)
    - text: 사전 추출된 텍스트 (provider가 바이너리 지원 안 할 때 폴백)
    - mime_type: 'application/pdf', 'text/markdown' 등
    - file_name: 표시용

    PDF처럼 두 표현을 모두 가질 수도 있고(예: Gemini는 data, OpenAI는 text 사용),
    HWP처럼 LibreAI로 변환된 텍스트만 있을 수도 있다.
    """
    file_name: str
    mime_type: str
    data: bytes | None = None
    text: str | None = None


@dataclass
class LLMRequest:
    """단일 LLM 호출 요청."""
    system: str                       # system instruction
    user_text: str                    # 사용자 프롬프트 본문
    model: str                        # provider별 모델 ID
    temperature: float = 0.1
    response_json: bool = False       # JSON 강제 출력 모드
    files: list[FilePart] = field(default_factory=list)
    max_output_tokens: int | None = None


@dataclass
class LLMResponse:
    """LLM 응답."""
    text: str
    model_used: str
    provider: str
    input_tokens: int | None = None
    output_tokens: int | None = None


class LLMProvider(ABC):
    """provider 어댑터 베이스."""

    name: ClassVar[str]             # 'gemini' | 'claude' | 'openai'
    label: ClassVar[str]
    env_var: ClassVar[str]          # API 키 환경변수
    supports_native_pdf: ClassVar[bool] = False
    max_pdf_bytes: ClassVar[int] = 0  # native PDF 한도 (0=무제한 또는 미지원)

    @classmethod
    def is_available(cls) -> bool:
        import os
        return bool(os.getenv(cls.env_var, "").strip())

    @abstractmethod
    async def generate(self, request: LLMRequest) -> LLMResponse:
        """단일 LLM 호출. 실패 시 backend.services.llm.exceptions의 예외 raise."""
        raise NotImplementedError
