from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from backend.db.crud import get_agency_settings, get_user_by_username, save_agency_settings
from backend.db.database import get_db

router = APIRouter()


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    id: int
    username: str
    name: str
    role: str


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
async def login(request: LoginRequest, db: AsyncSession = Depends(get_db)):
    user = await get_user_by_username(db, request.username)
    if not user or user.password != request.password:
        raise HTTPException(status_code=401, detail="아이디 또는 비밀번호가 올바르지 않습니다.")
    return LoginResponse(
        id=user.id,
        username=user.username,
        name=user.name,
        role=user.role,
    )
