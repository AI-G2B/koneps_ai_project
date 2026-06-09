from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.rate_limit import limiter
from backend.api.security import (
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)
from backend.db.crud import (
    create_user,
    get_agency_settings,
    get_user_by_username,
    save_agency_settings,
    update_user_profile,
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


class RegisterRequest(BaseModel):
    username: str
    password: str
    name: str
    position: str  # CEO | PM | 영업담당자 | 입찰담당자


POSITION_TO_ROLE = {
    "CEO": "ceo",
    "PM": "pm",
    "영업담당자": "영업담당자",
    "입찰담당자": "입찰담당자",
}


class RegisterResponse(BaseModel):
    id: int
    username: str
    name: str
    role: str


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


@router.post("/register", response_model=RegisterResponse, status_code=201)
@limiter.limit("10/minute")
async def register(request: Request, body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    role = POSITION_TO_ROLE.get(body.position)
    if role is None:
        raise HTTPException(status_code=400, detail="유효하지 않은 직급입니다.")
    existing = await get_user_by_username(db, body.username)
    if existing:
        raise HTTPException(status_code=409, detail="이미 사용 중인 아이디입니다.")
    if len(body.username) < 3 or len(body.username) > 50:
        raise HTTPException(status_code=400, detail="아이디는 3~50자여야 합니다.")
    if len(body.password) < 4:
        raise HTTPException(status_code=400, detail="비밀번호는 4자 이상이어야 합니다.")
    _ = request
    hashed = hash_password(body.password)
    user = await create_user(db, body.username, hashed, body.name, role)
    return RegisterResponse(id=user.id, username=user.username, name=user.name, role=user.role)


@router.get("/me", response_model=UserInfo)
async def me(current: User = Depends(get_current_user)) -> UserInfo:
    """토큰 검증 + 현재 사용자 정보 반환 (프런트 부팅 시 토큰 유효성 확인용)."""
    return UserInfo(id=current.id, username=current.username, name=current.name, role=current.role)


class UpdateProfileRequest(BaseModel):
    name: str | None = None
    current_password: str | None = None
    new_password: str | None = None
    position: str | None = None  # CEO | PM | 영업담당자 | 입찰담당자 | 법무담당자


@router.patch("/profile", response_model=UserInfo)
async def update_profile(
    body: UpdateProfileRequest,
    current: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """이름, 비밀번호, 직급을 변경한다."""
    new_name = None
    new_hashed = None
    new_role = None

    if body.name is not None:
        body.name = body.name.strip()
        if not body.name:
            raise HTTPException(status_code=400, detail="이름은 비워둘 수 없습니다.")
        new_name = body.name

    if body.new_password is not None:
        if not body.current_password:
            raise HTTPException(status_code=400, detail="현재 비밀번호를 입력해주세요.")
        if not verify_password(body.current_password, current.password):
            raise HTTPException(status_code=400, detail="현재 비밀번호가 올바르지 않습니다.")
        if len(body.new_password) < 4:
            raise HTTPException(status_code=400, detail="새 비밀번호는 4자 이상이어야 합니다.")
        new_hashed = hash_password(body.new_password)

    if body.position is not None:
        mapped = POSITION_TO_ROLE.get(body.position)
        if mapped is None:
            raise HTTPException(status_code=400, detail="유효하지 않은 직급입니다.")
        new_role = mapped

    if new_name is None and new_hashed is None and new_role is None:
        raise HTTPException(status_code=400, detail="변경할 정보를 입력해주세요.")

    updated = await update_user_profile(db, current.id, new_name, new_hashed, new_role)
    if not updated:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")
    return UserInfo(id=updated.id, username=updated.username, name=updated.name, role=updated.role)
