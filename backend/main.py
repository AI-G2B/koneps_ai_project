from contextlib import asynccontextmanager

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.api.routes import bids, analysis, search

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
