import json
import os
from contextlib import asynccontextmanager

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.api.routes import bids, analysis, search, auth, outline, admin
from backend.api.security import get_current_user, require_admin
from backend.api.rate_limit import limiter
from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler

SCHEDULE_HOURS = [10, 13, 16, 20]


async def collect_today():
    """스케줄러가 호출하는 자동 수집 함수 — 오늘 날짜 공고를 자동 수집하고 신규 건은 자동 분석 큐에 enqueue."""
    from datetime import date
    from backend.collector.service import collect_and_save
    from backend.db.database import AsyncSessionLocal
    from backend.services.analysis_queue import enqueue_auto_analysis

    today = date.today().strftime("%Y%m%d")
    async with AsyncSessionLocal() as db:
        result = await collect_and_save(db, today, today)
        print(f"[스케줄러] 수집 완료 — 저장: {result['saved']}건 / 중복: {result['skipped']}건 / 오류: {result['errors']}건")
    queued = enqueue_auto_analysis(result.get("new_notice_ids", []))
    if queued:
        print(f"[스케줄러] 자동 분석 enqueue: {queued}건")


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
    from backend.services.analysis_queue import enqueue_auto_analysis
    queued = enqueue_auto_analysis(result.get("new_notice_ids", []))
    if queued:
        print(f"[갭 수집] 자동 분석 enqueue: {queued}건")


async def _bootstrap_admin_account(db) -> None:
    """첫 부팅 시 admin 계정이 하나도 없으면 기본 admin01/1234를 만든다.

    이미 admin role 사용자가 있으면 건드리지 않는다 (idempotent).
    운영 환경에선 ADMIN_BOOTSTRAP_USERNAME/PASSWORD 환경변수로 오버라이드 가능.
    배포 후 admin01 비밀번호는 운영자가 seed_admin CLI로 즉시 바꾸는 걸 권장한다.
    """
    from sqlalchemy import select
    from backend.api.security import hash_password
    from backend.db.models import User

    existing = (await db.execute(
        select(User).where(User.role == "admin")
    )).scalar_one_or_none()
    if existing:
        return

    username = os.getenv("ADMIN_BOOTSTRAP_USERNAME", "admin01").strip() or "admin01"
    password = os.getenv("ADMIN_BOOTSTRAP_PASSWORD", "1234")
    db.add(User(
        username=username,
        password=hash_password(password),
        name="관리자",
        role="admin",
    ))
    await db.commit()
    print(f"[bootstrap] 관리자 계정 자동 생성: {username} (기본 비밀번호는 즉시 변경 권장)")


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
        # notices (bid_ntce_no, bid_ntce_ord) UNIQUE — schema.sql에 정의돼있지만 운영 DB에 미반영. 동시 수집 race 방지.
        await conn.execute(text("""
            CREATE UNIQUE INDEX IF NOT EXISTS idx_notices_bid_ord
                ON notices (bid_ntce_no, bid_ntce_ord)
        """))
        # is_rfp: d425caf에서 모델에 추가됐으나 운영 DB 동기화가 누락된 컬럼. idempotent하게 보장.
        await conn.execute(text("""
            ALTER TABLE attachments ADD COLUMN IF NOT EXISTS is_rfp BOOLEAN NOT NULL DEFAULT FALSE
        """))
        # agency_settings: 모델·코드는 쓰는데 DB 동기화 누락된 컬럼/테이블. idempotent하게 보장.
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS agency_settings (
                id           SERIAL PRIMARY KEY,
                user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                agency_name  VARCHAR(200) NOT NULL,
                setting_type VARCHAR(10) NOT NULL,
                created_at   TIMESTAMPTZ DEFAULT NOW()
            )
        """))
        # 첨부파일 텍스트 변환 캐시 — pypdf(PDF) / LibreAI(HWP) 결과를 영속 저장해 재분석·제안목차 시 재변환 회피.
        await conn.execute(text("""
            ALTER TABLE attachments ADD COLUMN IF NOT EXISTS converted_md TEXT
        """))
        await conn.execute(text("""
            ALTER TABLE attachments ADD COLUMN IF NOT EXISTS converted_at TIMESTAMPTZ
        """))
        await conn.execute(text("""
            ALTER TABLE attachments ADD COLUMN IF NOT EXISTS conversion_source VARCHAR(20)
        """))
        # 제안목차 RFP 원문 (요구사항 섹션 verbatim) — 앵커 추출 LLM 결과 저장.
        await conn.execute(text("""
            ALTER TABLE proposal_outlines ADD COLUMN IF NOT EXISTS rfp_raw_text TEXT
        """))
        # LLM 활성 설정 — admin 콘솔에서 provider/model/fallback/temperature 변경.
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS llm_config (
                id                INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
                provider          VARCHAR(20) NOT NULL,
                model             VARCHAR(100) NOT NULL,
                fallback_provider VARCHAR(20),
                fallback_model    VARCHAR(100),
                temperature       REAL NOT NULL DEFAULT 0.1,
                updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_by        INTEGER REFERENCES users(id)
            )
        """))
        # LLM provider별 등록 모델 — admin이 새 모델 등장 시 추가/삭제.
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS provider_models (
                id         SERIAL PRIMARY KEY,
                provider   VARCHAR(20) NOT NULL,
                model      VARCHAR(100) NOT NULL,
                label      VARCHAR(100),
                is_default BOOLEAN NOT NULL DEFAULT FALSE,
                UNIQUE (provider, model)
            )
        """))
        # 프롬프트 관리 — admin이 DB에서 직접 편집할 수 있도록 키별 저장.
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS prompts (
                key          VARCHAR(80) PRIMARY KEY,
                content      TEXT NOT NULL,
                description  TEXT,
                placeholders TEXT[] NOT NULL DEFAULT '{}',
                version      INTEGER NOT NULL DEFAULT 1,
                updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_by   INTEGER REFERENCES users(id)
            )
        """))
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS prompt_versions (
                id        SERIAL PRIMARY KEY,
                key       VARCHAR(80) NOT NULL REFERENCES prompts(key) ON DELETE CASCADE,
                version   INTEGER NOT NULL,
                content   TEXT NOT NULL,
                saved_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                saved_by  INTEGER REFERENCES users(id),
                UNIQUE (key, version)
            )
        """))
    # 프롬프트·LLM 설정 defaults 시드 — 신규 키/row는 INSERT, 기존은 무시 (idempotent).
    from backend.services.prompt_store import seed_prompts
    from backend.services.llm_config_store import seed_llm_config
    from backend.db.database import AsyncSessionLocal
    async with AsyncSessionLocal() as db:
        await seed_prompts(db)
        await seed_llm_config(db)
        await _bootstrap_admin_account(db)

    async with engine.begin() as conn:
        # 서버 재시작·강제 종료로 'analyzing' 상태에 박혀 다시 풀리지 않는 공고 회복.
        # 단일 worker 운영이므로 재시작 = 모든 in-flight 분석 작업이 죽은 것. 무조건 collected로 되돌려
        # 자동 분석 큐가 다시 잡을 수 있게 한다. (멀티 worker로 전환 시 임계값으로 다시 좁혀야 함)
        await conn.execute(text("""
            UPDATE notices
               SET pipeline_status = 'collected'
             WHERE pipeline_status = 'analyzing'
        """))

    # tzlocal이 못 잡거나 컨테이너 환경에서 UTC로 잡히는 케이스 방어 — 명시적 KST 지정.
    scheduler = AsyncIOScheduler(timezone="Asia/Seoul")
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
admin_only = [Depends(require_admin)]
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(bids.router, prefix="/bids", tags=["공고"], dependencies=protected)
app.include_router(analysis.router, prefix="/analysis", tags=["분석"], dependencies=protected)
app.include_router(outline.router, prefix="/outline", tags=["제안목차"], dependencies=protected)
app.include_router(search.router, prefix="/search", tags=["검색"], dependencies=protected)
app.include_router(admin.router, prefix="/admin", tags=["관리자"], dependencies=admin_only)
