import json
import os
from contextlib import asynccontextmanager

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.api.routes import bids, analysis, search, auth, outline
from backend.api.security import get_current_user
from backend.api.rate_limit import limiter
from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler

SCHEDULE_HOURS = [10, 13, 16, 20]


async def collect_today():
    """스케줄러가 호출하는 자동 수집 함수 — 오늘 날짜 공고를 자동 수집한다."""
    from datetime import date
    from backend.collector.service import collect_and_save
    from backend.db.database import AsyncSessionLocal

    today = date.today().strftime("%Y%m%d")
    async with AsyncSessionLocal() as db:
        result = await collect_and_save(db, today, today)
        print(f"[스케줄러] 수집 완료 — 저장: {result['saved']}건 / 중복: {result['skipped']}건 / 오류: {result['errors']}건")


async def collect_gap():
    """서버 시작 시 마지막 스케줄 수집 이후 현재까지의 빈틈을 수집한다."""
    from datetime import datetime, timedelta
    from backend.collector.service import collect_and_save
    from backend.db.database import AsyncSessionLocal

    now = datetime.now()
    today_slots = [
        now.replace(hour=h, minute=0, second=0, microsecond=0)
        for h in SCHEDULE_HOURS
    ]
    past_slots = [t for t in today_slots if t <= now]
    if past_slots:
        last_slot = past_slots[-1]
    else:
        # 오늘 첫 스케줄(10:00) 이전 → 어제 마지막 슬롯(20:00)
        yesterday = now - timedelta(days=1)
        last_slot = yesterday.replace(hour=SCHEDULE_HOURS[-1], minute=0, second=0, microsecond=0)

    start_date = last_slot.strftime("%Y%m%d")
    start_time = last_slot.strftime("%H%M")
    end_date = now.strftime("%Y%m%d")
    end_time = now.strftime("%H%M")

    async with AsyncSessionLocal() as db:
        result = await collect_and_save(db, start_date, end_date,
                                        start_time=start_time, end_time=end_time)
        print(f"[갭 수집] {start_date} {start_time}~{end_date} {end_time} 완료 "
              f"— 저장: {result['saved']}건 / 중복: {result['skipped']}건 / 오류: {result['errors']}건")


@asynccontextmanager
async def lifespan(app: FastAPI):
    from datetime import datetime, timedelta
    from sqlalchemy import text
    from backend.db.database import engine

    async with engine.begin() as conn:
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS users (
                id         SERIAL PRIMARY KEY,
                username   VARCHAR(50) NOT NULL UNIQUE,
                password   VARCHAR(200) NOT NULL,
                name       VARCHAR(50) NOT NULL,
                role       VARCHAR(20) NOT NULL DEFAULT 'manager',
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        """))
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS notice_memos (
                id         SERIAL PRIMARY KEY,
                notice_id  INTEGER NOT NULL UNIQUE REFERENCES notices(id) ON DELETE CASCADE,
                content    TEXT NOT NULL DEFAULT '',
                updated_at TIMESTAMPTZ DEFAULT NOW()
            )
        """))
        await conn.execute(text("""
            ALTER TABLE notice_memos ADD COLUMN IF NOT EXISTS author_id INTEGER REFERENCES users(id)
        """))
        await conn.execute(text("""
            ALTER TABLE notice_memos ADD COLUMN IF NOT EXISTS author_name VARCHAR(50)
        """))

    scheduler = AsyncIOScheduler()
    # 매일 정해진 시간 자동 수집
    for hour in SCHEDULE_HOURS:
        scheduler.add_job(collect_today, "cron", hour=hour, minute=0, id=f"collect_{hour}")
    # 서버 시작 5초 후 전일 20:00 이후 빈틈 수집 (1회)
    scheduler.add_job(collect_gap, "date", run_date=datetime.now() + timedelta(seconds=5), id="collect_init")
    scheduler.start()
    print("[스케줄러] 10:00 13:00 16:00 20:00 공고 수집 시작")
    yield
    scheduler.shutdown()


# Swagger/Redoc/OpenAPI 스펙은 인증 없이 열려있으면 API 구조가 통째로 노출됨.
# 기본은 차단. 디버깅 시 .env에 ENABLE_DOCS=true 를 두면 열린다.
_ENABLE_DOCS = os.getenv("ENABLE_DOCS", "false").lower() == "true"
app = FastAPI(
    title="나라장터 AI 분석 플랫폼",
    lifespan=lifespan,
    docs_url="/docs" if _ENABLE_DOCS else None,
    redoc_url="/redoc" if _ENABLE_DOCS else None,
    openapi_url="/openapi.json" if _ENABLE_DOCS else None,
)

# slowapi: 한도 초과 시 429 응답으로 자동 변환
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


def _parse_cors_origins() -> list[str]:
    raw = (os.getenv("CORS_ORIGINS") or "").strip()
    if not raw or raw == "*":
        # 기본값: 로컬 개발만 허용. 운영은 .env로 명시.
        return ["http://localhost:5173"]
    # JSON 배열 또는 콤마 구분 문자열 모두 허용
    if raw.startswith("["):
        try:
            return [str(o) for o in json.loads(raw)]
        except json.JSONDecodeError:
            pass
    return [o.strip() for o in raw.split(",") if o.strip()]


app.add_middleware(
    CORSMiddleware,
    allow_origins=_parse_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# /auth/login, /auth/me 만 인증 없이 접근 가능. 나머지 데이터/뮤테이션 라우터는 전부 가드.
protected = [Depends(get_current_user)]
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(bids.router, prefix="/bids", tags=["공고"], dependencies=protected)
app.include_router(analysis.router, prefix="/analysis", tags=["분석"], dependencies=protected)
app.include_router(outline.router, prefix="/outline", tags=["제안목차"], dependencies=protected)
app.include_router(search.router, prefix="/search", tags=["검색"], dependencies=protected)
