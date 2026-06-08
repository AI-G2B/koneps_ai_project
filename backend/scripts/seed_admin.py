"""관리자 계정 시드 CLI.

사용:
    python -m backend.scripts.seed_admin --username admin01 --password <plain> [--name "관리자"]

기존 사용자가 있으면 password/role을 admin으로 갱신(upsert), 없으면 새로 INSERT.
비밀번호는 bcrypt로 해시 저장.
"""
from __future__ import annotations

import argparse
import asyncio
import sys
from pathlib import Path

# 단일 실행 시 backend.* 임포트 가능하도록 프로젝트 루트를 sys.path에 추가.
_ROOT = Path(__file__).resolve().parents[2]
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from sqlalchemy import select  # noqa: E402

from backend.api.security import hash_password  # noqa: E402
from backend.db.database import AsyncSessionLocal  # noqa: E402
from backend.db.models import User  # noqa: E402


async def upsert_admin(username: str, password: str, name: str) -> None:
    pw_hash = hash_password(password)
    async with AsyncSessionLocal() as db:
        existing = (await db.execute(
            select(User).where(User.username == username)
        )).scalar_one_or_none()
        if existing:
            existing.password = pw_hash
            existing.role = "admin"
            existing.name = name
            action = "갱신"
        else:
            db.add(User(username=username, password=pw_hash, role="admin", name=name))
            action = "신규 생성"
        await db.commit()
    print(f"[seed_admin] {username} {action} 완료 (role=admin)")


def main() -> None:
    parser = argparse.ArgumentParser(description="관리자 계정 시드")
    parser.add_argument("--username", required=True, help="관리자 username")
    parser.add_argument("--password", required=True, help="평문 비밀번호 (bcrypt 해시 후 저장)")
    parser.add_argument("--name", default="관리자", help="표시 이름 (기본: '관리자')")
    args = parser.parse_args()

    asyncio.run(upsert_admin(args.username, args.password, args.name))


if __name__ == "__main__":
    main()
