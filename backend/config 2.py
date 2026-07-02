"""AI 분석/제안목차 생성에 사용되는 외부 API 설정.

DB / 인증 / 수집 관련 설정은 backend/db/database.py의 os.getenv 패턴을 그대로 사용.
이 파일은 AI 파트(강현묵)에서만 참조하며, 차후 팀 공통 config로 통합 예정.
"""
from functools import lru_cache

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Google Gemini API
    gemini_api_key: str = ""
    gemini_model: str = "gemini-3.1-pro-preview"
    gemini_fallback_model: str = "gemini-2.5-pro"

    # 리브레AI HWP 변환 API
    libreai_api_key: str = ""
    libreai_api_url: str = "https://convert.liberoai.net/api"

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }


@lru_cache()
def get_settings() -> Settings:
    return Settings()
