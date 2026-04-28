"""Seed the database with an initial admin user.

Usage:
    python -m app.seed

Creates a superadmin user if none exists:
    username: admin
    password: admin123 (hash via bcrypt)
"""

import asyncio
import sys

from sqlalchemy import select

from app.database import async_session
from app.models.base import User
from app.core.security import hash_password


async def seed_admin() -> None:
    async with async_session() as db:
        result = await db.execute(select(User).where(User.username == "admin"))
        if result.scalars().first():
            print("Admin user already exists — skipping.")
            return

        user = User(
            phone="0000000000",
            username="admin",
            hashed_password=hash_password("admin123"),
            role="superadmin",
            company_id=None,
            is_active=True,
        )
        db.add(user)
        await db.commit()
        print("Created admin user (username: admin, password: admin123)")


if __name__ == "__main__":
    asyncio.run(seed_admin())
