"""Concrete repository implementations for the Operations context."""

from __future__ import annotations

from datetime import date
from typing import Sequence

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.contexts.operations.domain.entities import BookedTrip, DeliveredTrip
from app.contexts.operations.domain.repositories import (
    BookedTripRepository,
    DeliveredTripRepository,
)
from app.contexts.operations.domain.value_objects import (
    BookedTripId,
    DeliveredTripId,
)
from app.contexts.operations.infrastructure.mappers import (
    booked_trip_to_domain,
    booked_trip_to_orm,
    delivered_trip_to_domain,
    delivered_trip_to_orm,
)
from app.contexts.operations.infrastructure.orm import (
    BookedTripORM,
    DeliveredTripORM,
)


# ── BookedTrip ────────────────────────────────────────────────────


class SqlBookedTripRepository(BookedTripRepository):
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def _hydrate(self, orm: BookedTripORM) -> BookedTrip:
        return booked_trip_to_domain(orm)

    async def get_by_id(self, tid: BookedTripId) -> BookedTrip | None:
        orm = (await self.session.execute(
            select(BookedTripORM).where(BookedTripORM.id == int(tid))
        )).scalar_one_or_none()
        return await self._hydrate(orm) if orm else None

    async def list(
        self,
        *,
        offset: int,
        limit: int,
        client_id: int | None = None,
        trip_date_from: date | None = None,
        trip_date_to: date | None = None,
    ) -> tuple[Sequence[BookedTrip], int]:
        q = select(BookedTripORM)
        if client_id is not None:
            q = q.where(BookedTripORM.client_id == client_id)
        if trip_date_from is not None:
            q = q.where(BookedTripORM.trip_date >= trip_date_from)
        if trip_date_to is not None:
            q = q.where(BookedTripORM.trip_date <= trip_date_to)
        total = await self.session.scalar(
            select(func.count()).select_from(q.subquery())
        ) or 0
        q = q.order_by(BookedTripORM.id.desc()).offset(offset).limit(limit)
        rows = list((await self.session.execute(q)).scalars().all())
        items = [await self._hydrate(r) for r in rows]
        return items, int(total)

    async def find_duplicate(
        self,
        *,
        client_id: int,
        trip_date: date,
        container_number: str,
    ) -> BookedTrip | None:
        q = (
            select(BookedTripORM)
            .where(
                BookedTripORM.client_id == client_id,
                BookedTripORM.trip_date == trip_date,
                BookedTripORM.cont_number == container_number,
            )
            .limit(1)
        )
        orm = (await self.session.execute(q)).scalars().first()
        return await self._hydrate(orm) if orm else None

    async def add(self, t: BookedTrip) -> BookedTrip:
        orm = booked_trip_to_orm(t)
        self.session.add(orm)
        await self.session.flush()
        return await self._hydrate(orm)

    async def save(self, t: BookedTrip) -> BookedTrip:
        existing = (await self.session.execute(
            select(BookedTripORM).where(BookedTripORM.id == int(t.id))
        )).scalar_one()
        booked_trip_to_orm(t, existing)
        await self.session.flush()
        return await self._hydrate(existing)

    async def delete(self, tid: BookedTripId) -> None:
        orm = (await self.session.execute(
            select(BookedTripORM).where(BookedTripORM.id == int(tid))
        )).scalar_one_or_none()
        if orm is None:
            return
        await self.session.delete(orm)
        await self.session.flush()


# ── DeliveredTrip ────────────────────────────────────────────────────


class SqlDeliveredTripRepository(DeliveredTripRepository):
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def _hydrate(self, orm: DeliveredTripORM) -> DeliveredTrip:
        return delivered_trip_to_domain(orm)

    async def get_by_id(self, wid: DeliveredTripId) -> DeliveredTrip | None:
        orm = (await self.session.execute(
            select(DeliveredTripORM).where(DeliveredTripORM.id == int(wid))
        )).scalar_one_or_none()
        return await self._hydrate(orm) if orm else None

    async def list(
        self,
        *,
        offset: int,
        limit: int,
        client_id: int | None = None,
        driver_id: int | None = None,
        vendor_id: int | None = None,
        date_from: date | None = None,
        date_to: date | None = None,
        matched: bool | None = None,
        sort_by: str | None = None,
        sort_order: str = 'desc',
        search: str | None = None,
    ) -> tuple[Sequence[DeliveredTrip], int]:
        from app.models.domain import Client as ClientORM
        q = select(DeliveredTripORM)
        if client_id is not None:
            q = q.where(DeliveredTripORM.client_id == client_id)
        if driver_id is not None:
            q = q.where(DeliveredTripORM.driver_id == driver_id)
        if vendor_id is not None:
            q = q.where(DeliveredTripORM.vendor_id == vendor_id)
        if search:
            from sqlalchemy import exists
            from app.core.vi_search import vi_ilike
            client_exists = exists().where(
                ClientORM.id == DeliveredTripORM.client_id,
                or_(
                    vi_ilike(ClientORM.name, search),
                    vi_ilike(ClientORM.code, search),
                ),
            )
            q = q.where(or_(
                vi_ilike(DeliveredTripORM.vessel, search),
                vi_ilike(DeliveredTripORM.cont_number, search),
                client_exists,
            ))
        if date_from is not None:
            q = q.where(
                (DeliveredTripORM.trip_date >= date_from) |
                ((DeliveredTripORM.trip_date == None) & (DeliveredTripORM.created_at >= date_from))  # noqa: E711
            )
        if date_to is not None:
            q = q.where(
                (DeliveredTripORM.trip_date <= date_to) |
                ((DeliveredTripORM.trip_date == None) & (DeliveredTripORM.created_at <= date_to))  # noqa: E711
            )
        if matched is not None:
            if matched:
                q = q.where(DeliveredTripORM.booked_trip_id.isnot(None))
            else:
                q = q.where(DeliveredTripORM.booked_trip_id.is_(None))
        total = await self.session.scalar(
            select(func.count()).select_from(q.subquery())
        ) or 0
        # Dynamic sort
        _SORTABLE_DIRECT = {
            'trip_date': DeliveredTripORM.trip_date,
            'vessel': DeliveredTripORM.vessel,
            'matched': DeliveredTripORM.booked_trip_id,
            'revenue': DeliveredTripORM.revenue,
            'created_at': DeliveredTripORM.created_at,
            'cont_number': DeliveredTripORM.cont_number,
            'cont_type': DeliveredTripORM.cont_type,
            'work_type': DeliveredTripORM.work_type,
        }
        sort_col = _SORTABLE_DIRECT.get(sort_by or '') if sort_by else None

        if sort_col is None and sort_by:
            from app.models.domain import Client as ClientORM, Location as LocationORM
            _JOIN_SORTS = {
                'client_code': (ClientORM, DeliveredTripORM.client_id, 'code'),
                'vehicle_plate': (None, DeliveredTripORM.vehicle_plate, None),
                'pickup_name': (LocationORM, DeliveredTripORM.pickup_location_id, 'name'),
                'dropoff_name': (LocationORM, DeliveredTripORM.dropoff_location_id, 'name'),
            }
            join_spec = _JOIN_SORTS.get(sort_by)
            if join_spec:
                model, fk_col, attr_name = join_spec
                q = q.outerjoin(model, model.id == fk_col)
                sort_col = getattr(model, attr_name)

        if sort_col is not None:
            order_expr = sort_col.asc() if sort_order == 'asc' else sort_col.desc()
            q = q.order_by(order_expr, DeliveredTripORM.id.desc())
        else:
            q = q.order_by(DeliveredTripORM.id.desc())
        q = q.offset(offset).limit(limit)
        rows = list((await self.session.execute(q)).scalars().all())
        items = [await self._hydrate(r) for r in rows]
        return items, int(total)

    async def list_by_ids(
        self, ids: Sequence[DeliveredTripId]
    ) -> Sequence[DeliveredTrip]:
        if not ids:
            return []
        rows = list((await self.session.execute(
            select(DeliveredTripORM).where(DeliveredTripORM.id.in_([int(i) for i in ids]))
        )).scalars().all())
        return [await self._hydrate(r) for r in rows]

    async def add(self, w: DeliveredTrip) -> DeliveredTrip:
        orm = delivered_trip_to_orm(w)
        self.session.add(orm)
        await self.session.flush()
        return await self._hydrate(orm)

    async def save(self, w: DeliveredTrip) -> DeliveredTrip:
        existing = (await self.session.execute(
            select(DeliveredTripORM).where(DeliveredTripORM.id == int(w.id))
        )).scalar_one()
        delivered_trip_to_orm(w, existing)
        await self.session.flush()
        return await self._hydrate(existing)

    async def delete(self, wid: DeliveredTripId) -> None:
        orm = (await self.session.execute(
            select(DeliveredTripORM).where(DeliveredTripORM.id == int(wid))
        )).scalar_one_or_none()
        if orm is None:
            return
        await self.session.delete(orm)
        await self.session.flush()
