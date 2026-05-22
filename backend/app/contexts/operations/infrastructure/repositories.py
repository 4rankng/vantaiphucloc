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

    async def _hydrate_many(self, orms: list[DeliveredTripORM]) -> list[DeliveredTrip]:
        """Batch-load containers for a list of trips in a single query."""
        if not orms:
            return []
        ids = [int(o.id) for o in orms]
        container_rows = (await self.session.execute(
            select(DeliveredTripContainerORM)
            .where(DeliveredTripContainerORM.delivered_trip_id.in_(ids))
            .order_by(DeliveredTripContainerORM.delivered_trip_id, DeliveredTripContainerORM.id.asc())
        )).scalars().all()
        containers_by_trip: dict[int, list[DeliveredTripContainerORM]] = {i: [] for i in ids}
        for c in container_rows:
            containers_by_trip[int(c.delivered_trip_id)].append(c)
        return [
            delivered_trip_to_domain(o, containers_by_trip[int(o.id)])
            for o in orms
        ]

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
        sort_by: str | None = None,
        sort_order: str = 'desc',
        search: str | None = None,
    ) -> tuple[Sequence[DeliveredTrip], int]:
        from sqlalchemy import exists, or_
        from app.models.domain import Client as ClientORM
        q = select(DeliveredTripORM)
        if client_id is not None:
            q = q.where(DeliveredTripORM.client_id == client_id)
        if driver_id is not None:
            q = q.where(DeliveredTripORM.driver_id == driver_id)
        if search:
            pattern = f"%{search}%"
            # Search vessel, operation_type on the trip itself, and container_number via EXISTS
            container_match = exists().where(
                DeliveredTripContainerORM.delivered_trip_id == DeliveredTripORM.id,
                DeliveredTripContainerORM.container_number.ilike(pattern),
            )
            client_match = exists().where(
                ClientORM.id == DeliveredTripORM.client_id,
                or_(
                    ClientORM.name.ilike(pattern),
                    ClientORM.code.ilike(pattern),
                ),
            )
            q = q.where(or_(
                DeliveredTripORM.vessel.ilike(pattern),
                DeliveredTripORM.operation_type.ilike(pattern),
                container_match,
                client_match,
            ))
        # Filter by trip_date (the actual trip day), falling back to created_at
        # for records that pre-date the trip_date column.
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
        if status is not None:
            q = q.where(DeliveredTripORM.status == str(status))
        total = await self.session.scalar(
            select(func.count()).select_from(q.subquery())
        ) or 0
        # Dynamic sort — whitelist valid columns to prevent SQL injection
        _SORTABLE_DIRECT = {
            'trip_date': DeliveredTripORM.trip_date,
            'vessel': DeliveredTripORM.vessel,
            'status': DeliveredTripORM.status,
            'revenue': DeliveredTripORM.revenue,
            'created_at': DeliveredTripORM.created_at,
            'operation_type': DeliveredTripORM.operation_type,
        }
        sort_col = _SORTABLE_DIRECT.get(sort_by or '') if sort_by else None

        if sort_col is None and sort_by:
            # JOIN-based sorts (client, vehicle, locations)
            from app.models.domain import Client as ClientORM, Vehicle as VehicleORM, Location as LocationORM
            _JOIN_SORTS = {
                'client_code': (ClientORM, DeliveredTripORM.client_id, 'code'),
                'vehicle_plate': (VehicleORM, DeliveredTripORM.vehicle_id, 'plate'),
                'pickup_name': (LocationORM, DeliveredTripORM.pickup_location_id, 'name'),
                'dropoff_name': (LocationORM, DeliveredTripORM.dropoff_location_id, 'name'),
            }
            join_spec = _JOIN_SORTS.get(sort_by)
            if join_spec:
                model, fk_col, attr_name = join_spec
                q = q.outerjoin(model, model.id == fk_col)
                sort_col = getattr(model, attr_name)

        if sort_col is None and sort_by in ('container_number', 'cont_type'):
            # Subquery sort: first container's number or type
            attr = DeliveredTripContainerORM.container_number if sort_by == 'container_number' else DeliveredTripContainerORM.cont_type
            sub = (
                select(attr)
                .where(DeliveredTripContainerORM.delivered_trip_id == DeliveredTripORM.id)
                .order_by(DeliveredTripContainerORM.id)
                .limit(1)
                .correlate(DeliveredTripORM)
                .scalar_subquery()
            )
            sort_col = sub

        if sort_col is not None:
            order_expr = sort_col.asc() if sort_order == 'asc' else sort_col.desc()
            # Secondary tie-break: id descending keeps stable ordering
            q = q.order_by(order_expr, DeliveredTripORM.id.desc())
        else:
            q = q.order_by(DeliveredTripORM.id.desc())
        q = q.offset(offset).limit(limit)
        rows = list((await self.session.execute(q)).scalars().all())
        items = await self._hydrate_many(rows)
        return items, int(total)

    async def list_by_ids(
        self, ids: Sequence[DeliveredTripId]
    ) -> Sequence[DeliveredTrip]:
        if not ids:
            return []
        rows = list((await self.session.execute(
            select(DeliveredTripORM).where(DeliveredTripORM.id.in_([int(i) for i in ids]))
        )).scalars().all())
        return await self._hydrate_many(rows)

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
