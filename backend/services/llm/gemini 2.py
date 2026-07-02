"""Google Gemini provider 어댑터.

PDF는 native 멀티모달로 직접 전송. HWP 등 텍스트는 string으로.
"""
from __future__ import annotations

import asyncio
import os

from google import genai
from google.genai import errors as genai_errors
from google.genai import types

from backend.services.llm.base import FilePart, LLMProvider, LLMRequest, LLMResponse
from backend.services.llm.exceptions import (
    ContextOverflowError,
    ProviderError,
    ProviderUnavailableError,
    RateLimitError,
)


class GeminiProvider(LLMProvider):
    name = "gemini"
    label = "Google Gemini"
    env_var = "GEMINI_API_KEY"
    supports_native_pdf = True
    max_pdf_bytes = 0  # Gemini는 사실상 무제한 (수십 MB)

    def __init__(self) -> None:
        key = os.getenv(self.env_var, "").strip()
        if not key:
            raise ProviderUnavailableError(f"{self.env_var} 미설정")
        self._client = genai.Client(api_key=key)

    @staticmethod
    def _build_contents(files: list[FilePart], user_text: str) -> list:
        parts: list = []
        for f in files:
            if f.data and f.mime_type == "application/pdf":
                parts.append(types.Part.from_bytes(data=f.data, mime_type=f.mime_type))
            elif f.text:
                parts.append(f"[파일: {f.file_name}]\n{f.text}")
        if user_text:
            parts.append(user_text)
        return parts

    async def generate(self, request: LLMRequest) -> LLMResponse:
        contents = self._build_contents(request.files, request.user_text)
        config: dict = {
            "system_instruction": request.system,
            "temperature": request.temperature,
        }
        if request.response_json:
            config["response_mime_type"] = "application/json"
        if request.max_output_tokens:
            config["max_output_tokens"] = request.max_output_tokens

        try:
            response = await asyncio.to_thread(
                self._client.models.generate_content,
                model=request.model,
                contents=contents,
                config=config,
            )
        except (genai_errors.ClientError, genai_errors.ServerError) as e:
            msg = str(e)
            if "429" in msg or "RESOURCE_EXHAUSTED" in msg:
                raise RateLimitError(msg) from e
            if "503" in msg or "UNAVAILABLE" in msg:
                raise RateLimitError(msg) from e  # 일시적 서버 부하 → fallback
            if "exceeds" in msg.lower() and "context" in msg.lower():
                raise ContextOverflowError(msg) from e
            raise ProviderError(msg) from e

        # usage 정보
        usage = getattr(response, "usage_metadata", None)
        return LLMResponse(
            text=response.text,
            model_used=request.model,
            provider=self.name,
            input_tokens=getattr(usage, "prompt_token_count", None) if usage else None,
            output_tokens=getattr(usage, "candidates_token_count", None) if usage else None,
        )
