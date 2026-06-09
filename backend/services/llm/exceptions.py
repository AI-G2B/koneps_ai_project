"""LLM 어댑터 공통 예외 — provider별 SDK 예외를 이 계층으로 정규화한다.

서비스 코드는 이 예외만 catch하면 됨. registry.call_with_fallback이 이 예외들을 보고
fallback 모델로 전환할지 결정한다.
"""


class LLMError(Exception):
    """LLM 어댑터 공통 베이스."""


class ProviderUnavailableError(LLMError):
    """API 키 미등록 등으로 provider를 사용할 수 없음 (.env 셋업 필요)."""


class RateLimitError(LLMError):
    """429 / quota 초과 — fallback 모델 전환 트리거."""


class LLMTimeoutError(LLMError):
    """응답 타임아웃 — fallback 모델 전환 트리거."""


class ContextOverflowError(LLMError):
    """입력이 모델 컨텍스트 한도를 초과 — fallback 또는 텍스트 모드 폴백 트리거."""


class ProviderError(LLMError):
    """기타 provider 측 오류 (4xx/5xx, 인증, 형식 등) — fallback 트리거."""
