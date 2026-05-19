"""Concrete repository implementations for the Operations context."""

from __future__ import annotations

from collections import defaultdict
from datetime import date
from typing import Sequence

from sqlalchemy import delete as sa_delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.contexts.operations.domain.entities import BookedTrip, DeliveredTrip
from app.contexts.operations.domain.repositories import (
    BookedTripRepository,
    DeliveredTripRepository,
)
from app.contexts.operations.domain.value_objects import (
    BookedTripId,
    BookedTripStatus,
    DeliveredTripId,
    DeliveredTripStatus,
)
from app.contexts.operations.infrastructure.mappers import (
    booked_container_to_orm,
    booked_trip_to_domain,
    booked_trip_to_orm,
    delivered_container_to_orm,
    delivered_trip_to_domain,
    delivered_trip_to_orm,
)
from app.contexts.operations.infrastructure.orm import (
    ReconciliationORM,
    BookedTripContainerORM,
    BookedTripORM,
    DeliveredTripContainerORM,
    DeliveredTripORM,
)


# ── BookedTrip ────────────────────────────────────────────────────


class SqlBookedTripRepository(BookedTripRepository):
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def _containers_for(self, tid: int) -> list[BookedTripContainerORM]:
        rows = (await self.session.execute(
            select(BookedTripContainerORM)
            .where(BookedTripContainerORM.booked_trip_id == tid)
            .order_by(BookedTripContainerORM.id.asc())
        )).scalars().all()
        return list(rows)

    async def _matched_wo_ids(self, tid: int) -> tuple[list[int], int]:
        rows = (await self.session.execute(
            select(
                ReconciliationORM.delivered_trip_id,
                ReconciliationORM.matched_by,
            ).where(
                ReconciliationORM.booked_trip_id == tid,
                ReconciliationORM.is_active == True,  # noqa: E712
            )
        )).all()
        wo_ids = [r[0] for r in rows]
        matched_by = rows[0][1] if rows else 0
        return wo_ids, matched_by

    async def _hydrate(self, orm: BookedTripORM) -> BookedTrip:
        containers = await self._containers_for(orm.id)
        matched, matched_by = await self._matched_wo_ids(orm.id)
        return booked_trip_to_domain(orm, containers, matched, matched_by=matched_by)

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
        status: BookedTripStatus | None = None,
        trip_date_from: date | None = None,
        trip_date_to: date | None = None,
        unpriced_only: bool = False,
    ) -> tuple[Sequence[BookedTrip], int]:
        q = select(BookedTripORM)
        if client_id is not None:
            q = q.where(BookedTripORM.client_id == client_id)
        if status is not None:
            q = q.where(BookedTripORM.status == str(status))
        if trip_date_from is not None:
            q = q.where(BookedTripORM.trip_date >= trip_date_from)
        if trip_date_to is not None:
            q = q.where(BookedTripORM.trip_date <= trip_date_to)
        if unpriced_only:
            q = q.where((BookedTripORM.revenue == 0) | (BookedTripORM.revenue.is_(None)))
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
            .join(
                BookedTripContainerORM,
                BookedTripContainerORM.booked_trip_id == BookedTripORM.id,
            )
            .where(
                BookedTripORM.client_id == client_id,
                BookedTripORM.trip_date == trip_date,
                BookedTripContainerORM.container_number == container_number,
            )
            .limit(1)
        )
        orm = (await self.session.execute(q)).scalars().first()
        return await self._hydrate(orm) if orm else None

    async def add(self, t: BookedTrip) -> BookedTrip:
        orm = booked_trip_to_orm(t)
        self.session.add(orm)
        await self.session.flush()
        for c in t.containers:
            c_orm = booked_container_to_orm(c)
            c_orm.booked_trip_id = orm.id
            self.session.add(c_orm)
        await self.session.flush()
        for wo_id in t.matched_delivered_trip_ids:
            self.session.add(ReconciliationORM(
                booked_trip_id=orm.id, delivered_trip_id=int(wo_id),
                match_score=1.0, matched_by=t.matched_by or 0,
            ))
        await self.session.flush()
        return await self._hydrate(orm)

    async def save(self, t: BookedTrip) -> BookedTrip:
        existing = (await self.session.execute(
            select(BookedTripORM).where(BookedTripORM.id == int(t.id))
        )).scalar_one()
        booked_trip_to_orm(t, existing)

        existing_containers = await self._containers_for(existing.id)
        existing_by_id = {c.id: c for c in existing_containers}
        keep_ids: set[int] = set()
        for c in t.containers:
            if c.id is not None and int(c.id) in existing_by_id:
                booked_container_to_orm(c, existing_by_id[int(c.id)])
                keep_ids.add(int(c.id))
            else:
                c_orm = booked_container_to_orm(c)
                c_orm.booked_trip_id = existing.id
                self.session.add(c_orm)
        for cid, c_orm in existing_by_id.items():
            if cid not in keep_ids:
                await self.session.delete(c_orm)

        await self.session.execute(
            sa_delete(ReconciliationORM).where(
                ReconciliationORM.booked_trip_id == existing.id
            )
        )
        for wo_id in t.matched_delivered_trip_ids:
            self.session.add(ReconciliationORM(
                booked_trip_id=existing.id, delivered_trip_id=int(wo_id),
                match_score=1.0, matched_by=t.matched_by or 0,
            ))
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

    async def _containers_for(self, wid: int) -> list[DeliveredTripContainerORM]:
        rows = (await self.session.execute(
            select(DeliveredTripContainerORM)
            .where(DeliveredTripContainerORM.delivered_trip_id == wid)
            .order_by(DeliveredTripContainerORM.id.asc())
        )).scalars().all()
        return list(rows)

    async def _hydrate(self, orm: DeliveredTripORM) -> DeliveredTrip:
        containers = await self._containers_for(orm.id)
        return delivered_trip_to_domain(orm, containers)

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
        date_from: date | None = None,
        date_to: date | None = None,
        status: DeliveredTripStatus | None = None,
    ) -> tuple[Sequence[DeliveredTrip], int]:
        q = select(DeliveredTripORM)
        if client_id is not None:
            q = q.where(DeliveredTripORM.client_id == client_id)
        if driver_id is not None:
            q = q.where(DeliveredTripORM.driver_id == driver_id)
        if date_from is not None:
            q = q.where(DeliveredTripORM.created_at >= date_from)
        if date_to is not None:
            q = q.where(DeliveredTripORM.created_at <= date_to)
        if status is not None:
            q = q.where(DeliveredTripORM.status == str(status))
        total = await self.session.scalar(
            select(func.count()).select_from(q.subquery())
        ) or 0
        q = q.order_by(DeliveredTripORM.id.desc()).offset(offset).limit(limit)
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
        for c in w.containers:
            c_orm = delivered_container_to_orm(c)
            c_orm.delivered_trip_id = orm.id
            self.session.add(c_orm)
        await self.session.flush()
        return await self._hydrate(orm)

    async def save(self, w: DeliveredTrip) -> DeliveredTrip:
        existing = (await self.session.execute(
            select(DeliveredTripORM).where(DeliveredTripORM.id == int(w.id))
        )).scalar_one()
        delivered_trip_to_orm(w, existing)
        existing_containers = await self._containers_for(existing.id)
        existing_by_id = {c.id: c for c in existing_containers}
        keep_ids: set[int] = set()
        for c in w.containers:
            if c.id is not None and int(c.id) in existing_by_id:
                delivered_container_to_orm(c, existing_by_id[int(c.id)])
                keep_ids.add(int(c.id))
            else:
                c_orm = delivered_container_to_orm(c)
                c_orm.delivered_trip_id = existing.id
                self.session.add(c_orm)
        for cid, c_orm in existing_by_id.items():
            if cid not in keep_ids:
                await self.session.delete(c_orm)
        await self.session.flush()
        return await self._hydrate(existing)

    async def set_status_bulk(
        self, ids: Sequence[DeliveredTripId], status: DeliveredTripStatus
    ) -> None:
        if not ids:
            return
        rows = (await self.session.execute(
            select(DeliveredTripORM).where(DeliveredTripORM.id.in_([int(i) for i in ids]))
        )).scalars().all()
        for w in rows:
            w.status = str(status)
        await self.session.flush()
