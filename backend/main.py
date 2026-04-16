from contextlib import asynccontextmanager

from apscheduler.schedulers.background import BackgroundScheduler
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.api.routes import bids, analysis, search


def collect_today():
    """스케줄러가 호출하는 자동 수집 함수 — 오늘 날짜 공고를 자동 수집한다."""
    import asyncio
    from datetime import date
    from backend.collector.service import collect_and_save
    from backend.db.database import AsyncSessionLocal

    async def _run():
        today = date.today().strftime("%Y%m%d")
        async with AsyncSessionLocal() as db:
            result = await collect_and_save(db, today, today)
            print(f"[스케줄러] 수집 완료 — 저장: {result['saved']}건 / 중복: {result['skipped']}건 / 오류: {result['errors']}건")

    asyncio.run(_run())


def collect_recent_sync(days: int = 7):
    """서버 시작 후 최근 N일치 공고를 한 번 수집한다."""
    import asyncio
    from datetime import date, timedelta
    from backend.collector.service import collect_and_save
    from backend.db.database import AsyncSessionLocal

    end = date.today()
    start = end - timedelta(days=days - 1)

    async def _run():
        async with AsyncSessionLocal() as db:
            result = await collect_and_save(db, start.strftime("%Y%m%d"), end.strftime("%Y%m%d"))
            print(f"[초기 수집] 최근 {days}일치 완료 — 저장: {result['saved']}건 / 중복: {result['skipped']}건 / 오류: {result['errors']}건")

    asyncio.run(_run())


@asynccontextmanager
async def lifespan(app: FastAPI):
    from datetime import datetime, timedelta

    scheduler = BackgroundScheduler()
    # 매일 정해진 시간 자동 수집
    for hour in [10, 13, 16, 20]:
        scheduler.add_job(collect_today, "cron", hour=hour, minute=0, id=f"collect_{hour}")
    # 서버 시작 5초 후 최근 7일치 초기 수집 (1회)
    scheduler.add_job(collect_recent_sync, "date", run_date=datetime.now() + timedelta(seconds=5), id="collect_init")
    scheduler.start()
    print("[스케줄러] 10:00 13:00 16:00 20:00 공고 수집 시작")
    yield
    scheduler.shutdown()


app = FastAPI(title="나라장터 AI 분석 플랫폼", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(bids.router, prefix="/bids", tags=["공고"])
app.include_router(analysis.router, prefix="/analysis", tags=["분석"])
app.include_router(search.router, prefix="/search", tags=["검색"])
