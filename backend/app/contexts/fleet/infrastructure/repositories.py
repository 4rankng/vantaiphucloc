"""Fleet SQL repositories."""

from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.contexts.fleet.domain.entities import Driver
from app.contexts.fleet.domain.repositories import DriverPage, DriverRepository
from app.contexts.fleet.domain.value_objects import DriverId
from app.contexts.fleet.infrastructure.mappers import to_domain
from app.contexts.fleet.infrastructure.orm import DriverORM


class SqlDriverRepository(DriverRepository):
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get(self, driver_id: DriverId) -> Driver | None:
        res = await self.session.execute(
            select(DriverORM).where(
                DriverORM.id == driver_id, DriverORM.role == "driver"
            )
        )
        row = res.scalar_one_or_none()
        return to_domain(row) if row else None

    async def list_paged(self, *, page: int, page_size: int) -> DriverPage:
        base = select(DriverORM).where(DriverORM.role == "driver")
        count_q = select(func.count(DriverORM.id)).where(
            DriverORM.role == "driver"
        )
        total = (await self.session.execute(count_q)).scalar() or 0
        rows = (
            await self.session.execute(
                base.order_by(DriverORM.username.asc())
                .offset((page - 1) * page_size)
                .limit(page_size)
            )
        ).scalars().all()
        return DriverPage(items=[to_domain(r) for r in rows], total=total)

    async def create(
        self,
        *,
        username: str,
        phone: str,
        hashed_password: str,
        full_name: str | None = None,
    ) -> Driver:
        row = DriverORM(
            username=username,
            phone=phone,
            hashed_password=hashed_password,
            role="driver",
            full_name=full_name,
            is_active=True,
        )
        self.session.add(row)
        await self.session.commit()
        await self.session.refresh(row)
        return to_domain(row)
