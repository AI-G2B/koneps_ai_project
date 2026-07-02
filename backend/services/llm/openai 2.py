"""OpenAI provider 어댑터.

GPT 계열 Chat Completions는 native PDF 미지원 — `FilePart.text` (pypdf 추출본)만 사용.
HWP는 LibreAI 변환본 텍스트로 처리.
"""
from __future__ import annotations

import os

import openai

from backend.services.llm.base import FilePart, LLMProvider, LLMRequest, LLMResponse
from backend.services.llm.exceptions import (
    ContextOverflowError,
    ProviderError,
    ProviderUnavailableError,
    RateLimitError,
)


_DEFAULT_MAX_TOKENS = 8192


class OpenAIProvider(LLMProvider):
    name = "openai"
    label = "OpenAI"
    env_var = "OPENAI_API_KEY"
    supports_native_pdf = False
    max_pdf_bytes = 0  # native PDF 미지원

    def __init__(self) -> None:
        key = os.getenv(self.env_var, "").strip()
        if not key:
            raise ProviderUnavailableError(f"{self.env_var} 미설정")
        self._client = openai.AsyncOpenAI(api_key=key)

    @staticmethod
    def _build_user_content(files: list[FilePart], user_text: str) -> str:
        parts: list[str] = []
        for f in files:
            if f.text:
                parts.append(f"[파일: {f.file_name}]\n{f.text}")
            elif f.data and f.mime_type == "application/pdf":
                # PDF 바이트만 있고 텍스트 추출본이 없으면 처리 불가. 명시적 에러 대신 경고만 남기고 건너뜀.
                parts.append(f"[파일: {f.file_name} — OpenAI는 PDF native 미지원이며 pre-extracted 텍스트가 없어 건너뜀]")
        if user_text:
            parts.append(user_text)
        return "\n\n".join(parts)

    async def generate(self, request: LLMRequest) -> LLMResponse:
        user_content = self._build_user_content(request.files, request.user_text)
        # OpenAI JSON 모드 요구: system 또는 messages에 "JSON" 문자열 필수.
        system = request.system
        if request.response_json and "json" not in system.lower() and "JSON" not in system:
            system = (system + "\n\nReturn ONLY valid JSON.").strip()
        try:
            kwargs: dict = {
                "model": request.model,
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user", "content": user_content},
                ],
                "temperature": request.temperature,
            }
            if request.max_output_tokens:
                kwargs["max_completion_tokens"] = request.max_output_tokens
            if request.response_json:
                kwargs["response_format"] = {"type": "json_object"}
            resp = await self._client.chat.completions.create(**kwargs)
        except openai.RateLimitError as e:
            raise RateLimitError(str(e)) from e
        except openai.APIStatusError as e:
            msg = str(e)
            if e.status_code == 429:
                raise RateLimitError(msg) from e
            if e.status_code in (502, 503, 504):
                raise RateLimitError(msg) from e
            if "context_length_exceeded" in msg or "maximum context" in msg.lower():
                raise ContextOverflowError(msg) from e
            raise ProviderError(msg) from e
        except openai.APIConnectionError as e:
            raise ProviderError(str(e)) from e

        choice = resp.choices[0]
        text = choice.message.content or ""
        usage = resp.usage
        return LLMResponse(
            text=text,
            model_used=request.model,
            provider=self.name,
            input_tokens=getattr(usage, "prompt_tokens", None) if usage else None,
            output_tokens=getattr(usage, "completion_tokens", None) if usage else None,
        )
