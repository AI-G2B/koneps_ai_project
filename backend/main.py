from contextlib import asynccontextmanager

from apscheduler.schedulers.background import BackgroundScheduler
from fastapi import FastAPI

from backend.api.routes import bids, analysis, search


def collect_today():
    """스케줄러가 호출하는 자동 수집 함수 — 강주현 DB 연결 후 구현"""
    pass


@asynccontextmanager
async def lifespan(app: FastAPI):
    scheduler = BackgroundScheduler()
    for hour in [10, 13, 16, 20]:
        scheduler.add_job(collect_today, "cron", hour=hour, minute=0, id=f"collect_{hour}")
    scheduler.start()
    print("[스케줄러] 10:00 13:00 16:00 20:00 공고 수집 시작")
    yield
    scheduler.shutdown()


app = FastAPI(title="나라장터 AI 분석 플랫폼", lifespan=lifespan)

app.include_router(bids.router, prefix="/bids", tags=["공고"])
app.include_router(analysis.router, prefix="/analysis", tags=["분석"])
app.include_router(search.router, prefix="/search", tags=["검색"])
