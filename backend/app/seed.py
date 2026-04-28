"""Seed the database with initial admin user.

Usage:
    python -m app.seed

Creates:
  superadmin user for Phúc Lộc.

Admin credentials:
    username: admin
    password: admin123 (hash via bcrypt)
"""

import asyncio

from sqlalchemy import select

from app.database import async_session
from app.models.base import User
from app.core.security import hash_password


async def seed_admin() -> None:
    async with async_session() as db:
        # Ensure admin user exists
        result = await db.execute(select(User).where(User.username == "admin"))
        admin = result.scalars().first()

        if admin is None:
            admin = User(
                phone="0000000000",
                username="admin",
                hashed_password=hash_password("admin123"),
                role="superadmin",
                is_active=True,
            )
            db.add(admin)
            print("Created admin user (username: admin, password: admin123)")
        else:
            print("Admin user already exists — skipping.")

        await db.commit()


if __name__ == "__main__":
    asyncio.run(seed_admin())
