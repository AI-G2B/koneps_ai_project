from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.rate_limit import limiter
from backend.api.security import (
    create_access_token,
    get_current_user,
    verify_password,
)
from backend.db.crud import (
    get_agency_settings,
    get_user_by_username,
    save_agency_settings,
)
from backend.db.database import get_db
from backend.db.models import User

router = APIRouter()


class LoginRequest(BaseModel):
    username: str
    password: str


class UserInfo(BaseModel):
    id: int
    username: str
    name: str
    role: str


class LoginResponse(UserInfo):
    access_token: str
    token_type: str = "bearer"


class AgencySettingsResponse(BaseModel):
    preferred: list[str]
    avoided: list[str]


class AgencySettingsRequest(BaseModel):
    user_id: int
    preferred: list[str]
    avoided: list[str]


@router.get("/agency-settings", response_model=AgencySettingsResponse)
async def get_agency_settings_endpoint(user_id: int, db: AsyncSession = Depends(get_db)):
    """사용자의 선호/기피 기관 설정을 조회한다."""
    settings = await get_agency_settings(db, user_id)
    preferred = [s.agency_name for s in settings if s.setting_type == "preferred"]
    avoided = [s.agency_name for s in settings if s.setting_type == "avoided"]
    return AgencySettingsResponse(preferred=preferred, avoided=avoided)


@router.put("/agency-settings", response_model=AgencySettingsResponse)
async def save_agency_settings_endpoint(
    request: AgencySettingsRequest, db: AsyncSession = Depends(get_db)
):
    """선호/기피 기관 설정을 저장한다. 기존 설정은 전부 교체된다."""
    await save_agency_settings(db, request.user_id, request.preferred, request.avoided)
    return AgencySettingsResponse(preferred=request.preferred, avoided=request.avoided)


@router.post("/login", response_model=LoginResponse)
@limiter.limit("10/minute")  # IP당 분당 10회 (브루트포스 차단)
async def login(request: Request, body: LoginRequest, db: AsyncSession = Depends(get_db)):
    user = await get_user_by_username(db, body.username)
    if not user or not verify_password(body.password, user.password):
        raise HTTPException(status_code=401, detail="아이디 또는 비밀번호가 올바르지 않습니다.")
    token = create_access_token(
        sub=user.username,
        extra={"uid": user.id, "name": user.name, "role": user.role},
    )
    _ = request  # slowapi가 request 인자를 요구함
    return LoginResponse(
        id=user.id,
        username=user.username,
        name=user.name,
        role=user.role,
        access_token=token,
    )


@router.get("/me", response_model=UserInfo)
async def me(current: User = Depends(get_current_user)) -> UserInfo:
    """토큰 검증 + 현재 사용자 정보 반환 (프런트 부팅 시 토큰 유효성 확인용)."""
    return UserInfo(id=current.id, username=current.username, name=current.name, role=current.role)
