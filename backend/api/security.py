"""인증/인가 유틸 — bcrypt 해싱 + JWT 발급/검증 + get_current_user 의존성."""
from datetime import datetime, timedelta, timezone
from typing import Annotated
import os

import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession

from backend.db.crud import get_user_by_username
from backend.db.database import get_db
from backend.db.models import User

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "").strip()
# 약한 시크릿으로 운영되면 토큰 위조 가능 → 임포트 단계에서 차단.
_WEAK_SECRETS = {"", "change-me", "secret", "changeme", "your-secret-key"}
if SECRET_KEY in _WEAK_SECRETS or len(SECRET_KEY) < 16:
    raise RuntimeError(
        "JWT_SECRET_KEY 가 비어있거나 너무 짧거나 기본값입니다. "
        ".env 에 16자 이상의 임의 문자열을 설정하세요."
    )
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 8 * 60  # 8시간 (업무일 단위)

# tokenUrl은 Swagger UI Authorize 버튼 동작용 — 실제 경로(/auth/login)와 일치
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login", auto_error=True)


def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except (ValueError, TypeError):
        # 해시 포맷이 깨졌거나 평문이 잘못된 경우
        return False


def create_access_token(*, sub: str, extra: dict) -> str:
    payload = {
        "sub": sub,
        **extra,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


async def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    credentials_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="인증이 필요합니다.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str | None = payload.get("sub")
        if not username:
            raise credentials_exc
    except JWTError:
        raise credentials_exc

    user = await get_user_by_username(db, username)
    if not user:
        raise credentials_exc
    return user
