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
from app.core.security import hash_password

SEED_USERS = [
    {"phone": "0000000000", "username": "admin",    "password": "admin123", "role": "superadmin",  "full_name": "Super Admin"},
    {"phone": "0000000001", "username": "giamdoc",   "password": "admin123", "role": "director",     "full_name": "Giám Đốc Test"},
    {"phone": "0000000002", "username": "ketoan",    "password": "admin123", "role": "accountant",   "full_name": "Kế Toán Test"},
    {"phone": "0901234567", "username": "taixe",     "password": "admin123", "role": "driver",
     "full_name": "Nguyễn Văn Tài", "tractor_plate": "29C-12345", "vendor": "Vận Tải Phúc Lộc"},
    {"phone": "0902345678", "username": "taixe1",    "password": "admin123", "role": "driver",
     "full_name": "Trần Minh Đức", "tractor_plate": "29C-23456", "vendor": "Vận Tải Phúc Lộc"},
    {"phone": "0903456789", "username": "taixe2",    "password": "admin123", "role": "driver",
     "full_name": "Lê Quang Anh", "tractor_plate": "29C-34567", "vendor": "Vận Tải Phúc Lộc"},
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
                    tractor_plate=u.get("tractor_plate"),
                    vendor=u.get("vendor"),
                ))
                print(f"Created {u['role']} user ({u['username']}/****)")
            else:
                # Update existing users with missing full_name/tractor_plate
                changed = False
                if not existing.full_name and u.get("full_name"):
                    existing.full_name = u["full_name"]
                    changed = True
                if not existing.tractor_plate and u.get("tractor_plate"):
                    existing.tractor_plate = u["tractor_plate"]
                    changed = True
                if not existing.vendor and u.get("vendor"):
                    existing.vendor = u["vendor"]
                    changed = True
                if u.get("phone") and existing.phone in (None, "", "0000000003"):
                    existing.phone = u["phone"]
                    changed = True
                if changed:
                    print(f"Updated {u['username']} with missing fields")
                else:
                    print(f"{u['role']} user '{u['username']}' already exists — skipping.")

        await db.commit()


if __name__ == "__main__":
    asyncio.run(seed_users())
