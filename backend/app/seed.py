"""Seed the database with Phúc Lộc company and initial admin user.

Usage:
    python -m app.seed

Creates:
  1. Company "Phúc Lộc" if none exists
  2. superadmin user assigned to Phúc Lộc

Admin credentials:
    username: admin
    password: admin123 (hash via bcrypt)
"""

import asyncio

from sqlalchemy import select

from app.database import async_session
from app.models.base import User
from app.models.domain import Company
from app.core.security import hash_password

PHUC_LOC_NAME = "Phúc Lộc"


async def seed_admin() -> None:
    async with async_session() as db:
        # 1. Ensure Phúc Lộc company exists
        result = await db.execute(select(Company).where(Company.name == PHUC_LOC_NAME))
        company = result.scalars().first()

        if company is None:
            company = Company(name=PHUC_LOC_NAME)
            db.add(company)
            await db.flush()
            print(f"Created company: {PHUC_LOC_NAME} (id={company.id})")
        else:
            print(f"Company {PHUC_LOC_NAME} already exists (id={company.id})")

        # 2. Ensure admin user exists
        result = await db.execute(select(User).where(User.username == "admin"))
        admin = result.scalars().first()

        if admin is None:
            admin = User(
                phone="0000000000",
                username="admin",
                hashed_password=hash_password("admin123"),
                role="superadmin",
                company_id=company.id,
                is_active=True,
            )
            db.add(admin)
            print(f"Created admin user (username: admin, password: admin123, company: {PHUC_LOC_NAME})")
        else:
            # Ensure admin is linked to Phúc Lộc
            if admin.company_id != company.id:
                admin.company_id = company.id
                print(f"Linked admin to company {PHUC_LOC_NAME}")
            else:
                print("Admin user already exists — skipping.")

        await db.commit()


if __name__ == "__main__":
    asyncio.run(seed_admin())
