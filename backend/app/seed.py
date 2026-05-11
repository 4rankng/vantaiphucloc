"""Seed the database with initial users.

Usage:
    python -m app.seed

Creates:
  superadmin  admin     / admin123
  director    giamdoc   / admin123
  accountant  ketoan    / admin123
  driver      taixe     / admin123
  driver      taixe1    / admin123
  driver      taixe2    / admin123
"""

import asyncio

from sqlalchemy import select

from app.database import async_session
from app.models.base import User
from app.models.domain import Setting
from app.core.security import hash_password

SEED_USERS = [
    {"phone": "0000000000", "username": "admin",    "password": "admin123", "role": "superadmin",  "full_name": "Super Admin"},
    {"phone": "0000000001", "username": "giamdoc",   "password": "admin123", "role": "director",     "full_name": "Giám Đốc Test"},
    {"phone": "0000000002", "username": "ketoan",    "password": "admin123", "role": "accountant",   "full_name": "Kế Toán Test"},
    {"phone": "0901234567", "username": "taixe",     "password": "admin123", "role": "driver",
     "full_name": "Nguyễn Văn Tài"},
    {"phone": "0902345678", "username": "taixe1",    "password": "admin123", "role": "driver",
     "full_name": "Trần Minh Đức"},
    {"phone": "0903456789", "username": "taixe2",    "password": "admin123", "role": "driver",
     "full_name": "Lê Quang Anh"},
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
                    full_name=u.get("full_name"),
                ))
                print(f"Created {u['role']} user ({u['username']}/****)")
            else:
                # Update existing users with missing full_name
                changed = False
                if not existing.full_name and u.get("full_name"):
                    existing.full_name = u["full_name"]
                    changed = True
                if u.get("phone") and existing.phone in (None, "", "0000000003"):
                    existing.phone = u["phone"]
                    changed = True
                if changed:
                    print(f"Updated {u['username']} with missing fields")
                else:
                    print(f"{u['role']} user '{u['username']}' already exists — skipping.")

        await db.commit()


async def seed_settings() -> None:
    """Seed default salary settings if not present."""
    async with async_session() as db:
        defaults = {
            "salary_from_day": "26",
            "salary_to_day": "25",
        }
        for key, value in defaults.items():
            existing = await db.get(Setting, key)
            if existing is None:
                db.add(Setting(key=key, value=value))
                print(f"Created setting {key}={value}")
        await db.commit()


async def _main() -> None:
    await seed_users()
    await seed_settings()


if __name__ == "__main__":
    asyncio.run(_main())
