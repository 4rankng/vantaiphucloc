"""Seed the database with initial users.

Usage:
    python -m app.seed

Creates:
  superadmin  admin     / admin123
  director    giamdoc   / admin123
  accountant  ketoan    / admin123
  driver      taixe1    / admin123
"""

import asyncio

from sqlalchemy import select

from app.database import async_session
from app.models.base import User
from app.core.security import hash_password

SEED_USERS = [
    {"phone": "0000000000", "username": "admin",   "password": "admin123", "role": "superadmin",  "full_name": "Super Admin"},
    {"phone": "0000000001", "username": "giamdoc",  "password": "admin123", "role": "director",     "full_name": "Giám Đốc Test"},
    {"phone": "0000000002", "username": "ketoan",   "password": "admin123", "role": "accountant",   "full_name": "Kế Toán Test"},
    {"phone": "0000000003", "username": "taixe1",   "password": "admin123", "role": "driver",       "full_name": "Tài Xế 1"},
]


async def seed_users() -> None:
    async with async_session() as db:
        for u in SEED_USERS:
            result = await db.execute(select(User).where(User.username == u["username"]))
            existing = result.scalars().first()

            if existing is None:
                db.add(User(
                    phone=u["phone"],
                    username=u["username"],
                    hashed_password=hash_password(u["password"]),
                    role=u["role"],
                    is_active=True,
                    full_name=u["full_name"],
                ))
                print(f"Created {u['role']} user ({u['username']}/****)")
            else:
                print(f"{u['role']} user '{u['username']}' already exists — skipping.")

        await db.commit()


if __name__ == "__main__":
    asyncio.run(seed_users())
