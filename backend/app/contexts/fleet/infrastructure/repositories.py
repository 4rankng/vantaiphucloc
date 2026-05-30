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

    async def list_paged(
        self,
        *,
        page: int,
        page_size: int,
        search: str | None = None,
        sort_by: str | None = None,
        sort_order: str = 'asc',
    ) -> DriverPage:
        from sqlalchemy import or_
        base = select(DriverORM).where(DriverORM.role == "driver")
        count_q = select(func.count(DriverORM.id)).where(DriverORM.role == "driver")
        if search:
            from app.core.vi_search import vi_ilike
            cond = or_(
                vi_ilike(DriverORM.username, search),
                vi_ilike(DriverORM.full_name, search),
                vi_ilike(DriverORM.phone, search),
            )
            base = base.where(cond)
            count_q = count_q.where(cond)
        total = (await self.session.execute(count_q)).scalar() or 0
        _SORTABLE = {
            'username': DriverORM.username,
            'full_name': DriverORM.full_name,
            'phone': DriverORM.phone,
        }
        sort_col = _SORTABLE.get(sort_by or '')
        if sort_col is not None:
            order_expr = sort_col.asc() if sort_order == 'asc' else sort_col.desc()
            base = base.order_by(order_expr, DriverORM.id.asc())
        else:
            base = base.order_by(DriverORM.username.asc())
        rows = (
            await self.session.execute(
                base.offset((page - 1) * page_size).limit(page_size)
            )
        ).scalars().all()
        return DriverPage(items=[to_domain(r) for r in rows], total=total)

    async def create(
        self,
        *,
        username: str,
        phone: str | None,
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
        await self.session.flush()
        await self.session.refresh(row)
        return to_domain(row)
