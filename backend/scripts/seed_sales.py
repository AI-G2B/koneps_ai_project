"""영업대표 테스트 계정 시드 CLI.

사용:
    python -m backend.scripts.seed_sales

기존 사용자가 있으면 password/role을 영업담당자로 갱신(upsert), 없으면 새로 INSERT.
비밀번호는 bcrypt로 해시 저장.
"""
from __future__ import annotations

import asyncio
import sys
from pathlib import Path

_ROOT = Path(__file__).resolve().parents[2]
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from sqlalchemy import select  # noqa: E402

from backend.api.security import hash_password  # noqa: E402
from backend.db.database import AsyncSessionLocal  # noqa: E402
from backend.db.models import User  # noqa: E402

SALES_ACCOUNTS = [
    {"username": "sales01", "password": "1234", "name": "영업대표1", "role": "영업담당자"},
]


async def seed() -> None:
    async with AsyncSessionLocal() as db:
        for acc in SALES_ACCOUNTS:
            pw_hash = hash_password(acc["password"])
            existing = (await db.execute(
                select(User).where(User.username == acc["username"])
            )).scalar_one_or_none()
            if existing:
                existing.password = pw_hash
                existing.role = acc["role"]
                existing.name = acc["name"]
                action = "갱신"
            else:
                db.add(User(username=acc["username"], password=pw_hash, role=acc["role"], name=acc["name"]))
                action = "신규 생성"
            await db.commit()
            print(f"[seed_sales] {acc['username']} {action} 완료 (role={acc['role']})")


if __name__ == "__main__":
    asyncio.run(seed())
