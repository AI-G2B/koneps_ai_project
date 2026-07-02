# koneps backend (FastAPI + APScheduler)
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    TZ=Asia/Seoul

# 시스템 의존성 (asyncpg는 libpq 없이도 동작하지만 빌드 도구는 일부 패키지에 필요)
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
        curl \
        ca-certificates \
        tzdata \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 의존성 먼저 (캐시 활용)
COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r /app/backend/requirements.txt

# 애플리케이션 소스
COPY backend /app/backend
COPY samples /app/samples

# 런타임 디렉토리 (수동 업로드 / G2B 다운로드)
RUN mkdir -p /app/downloads/manual

EXPOSE 8000

# uvicorn 단일 워커 (APScheduler가 워커별로 중복 실행되지 않도록)
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
