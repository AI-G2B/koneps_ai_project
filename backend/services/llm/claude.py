"""Anthropic Claude provider 어댑터.

PDF는 document content block로 native 전송 (32MB / 100p 이내).
초과 시 pre-extracted 텍스트(`FilePart.text`)로 폴백.
"""
from __future__ import annotations

import base64
import os

import anthropic

from backend.services.llm.base import FilePart, LLMProvider, LLMRequest, LLMResponse
from backend.services.llm.exceptions import (
    ContextOverflowError,
    ProviderError,
    ProviderUnavailableError,
    RateLimitError,
)


_PDF_MAX_BYTES = 32 * 1024 * 1024  # 32MB
_DEFAULT_MAX_TOKENS = 8192


class ClaudeProvider(LLMProvider):
    name = "claude"
    label = "Anthropic Claude"
    env_var = "ANTHROPIC_API_KEY"
    supports_native_pdf = True
    max_pdf_bytes = _PDF_MAX_BYTES

    def __init__(self) -> None:
        key = os.getenv(self.env_var, "").strip()
        if not key:
            raise ProviderUnavailableError(f"{self.env_var} 미설정")
        self._client = anthropic.AsyncAnthropic(api_key=key)

    @staticmethod
    def _build_user_content(files: list[FilePart], user_text: str) -> list[dict]:
        blocks: list[dict] = []
        for f in files:
            if f.data and f.mime_type == "application/pdf" and len(f.data) <= _PDF_MAX_BYTES:
                blocks.append({
                    "type": "document",
                    "source": {
                        "type": "base64",
                        "media_type": "application/pdf",
                        "data": base64.b64encode(f.data).decode("ascii"),
                    },
                })
                continue
            # 폴백: 사전 추출된 텍스트
            if f.text:
                blocks.append({"type": "text", "text": f"[파일: {f.file_name}]\n{f.text}"})
        if user_text:
            blocks.append({"type": "text", "text": user_text})
        return blocks

    async def generate(self, request: LLMRequest) -> LLMResponse:
        user_content = self._build_user_content(request.files, request.user_text)
        # JSON 모드 — Claude는 native 옵션이 없고 system 지시로 강제.
        system = request.system
        if request.response_json:
            system = (system + "\n\n반드시 유효한 JSON만 응답하라. 설명·코드펜스 금지.").strip()
        try:
            resp = await self._client.messages.create(
                model=request.model,
                max_tokens=request.max_output_tokens or _DEFAULT_MAX_TOKENS,
                system=system,
                messages=[{"role": "user", "content": user_content}],
                temperature=request.temperature,
            )
        except anthropic.RateLimitError as e:
            raise RateLimitError(str(e)) from e
        except anthropic.APIStatusError as e:
            msg = str(e)
            if e.status_code == 429:
                raise RateLimitError(msg) from e
            if e.status_code in (503, 529):
                raise RateLimitError(msg) from e
            if "context" in msg.lower() and ("exceed" in msg.lower() or "long" in msg.lower()):
                raise ContextOverflowError(msg) from e
            raise ProviderError(msg) from e
        except anthropic.APIConnectionError as e:
            raise ProviderError(str(e)) from e

        # 응답 본문: content[0].text (TextBlock)
        text = ""
        for block in resp.content:
            if getattr(block, "type", None) == "text":
                text += getattr(block, "text", "")
        usage = resp.usage
        return LLMResponse(
            text=text,
            model_used=request.model,
            provider=self.name,
            input_tokens=getattr(usage, "input_tokens", None),
            output_tokens=getattr(usage, "output_tokens", None),
        )
