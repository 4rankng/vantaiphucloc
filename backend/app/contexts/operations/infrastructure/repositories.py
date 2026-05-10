"""Concrete repository implementations for the Operations context."""

from __future__ import annotations

from collections import defaultdict
from datetime import date
from typing import Sequence

from sqlalchemy import delete as sa_delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.contexts.operations.domain.entities import TripOrder, WorkOrder
from app.contexts.operations.domain.repositories import (
    TripOrderRepository,
    WorkOrderRepository,
)
from app.contexts.operations.domain.value_objects import (
    TripOrderId,
    TripOrderStatus,
    WorkOrderId,
    WorkOrderStatus,
)
from app.contexts.operations.infrastructure.mappers import (
    trip_container_to_orm,
    trip_order_to_domain,
    trip_order_to_orm,
    trip_photo_to_orm,
    work_container_to_orm,
    work_order_to_domain,
    work_order_to_orm,
)
from app.contexts.operations.infrastructure.orm import (
    TripContainerPhotoORM,
    TripOrderContainerORM,
    TripOrderORM,
    TripOrderWorkOrderORM,
    WorkOrderContainerORM,
    WorkOrderORM,
)


# ── TripOrder ────────────────────────────────────────────────────


class SqlTripOrderRepository(TripOrderRepository):
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def _containers_for(self, tid: int) -> list[TripOrderContainerORM]:
        rows = (await self.session.execute(
            select(TripOrderContainerORM)
            .where(TripOrderContainerORM.trip_order_id == tid)
            .order_by(TripOrderContainerORM.id.asc())
        )).scalars().all()
        return list(rows)

    async def _photos_for_containers(
        self, container_ids: Sequence[int]
    ) -> dict[int, list[TripContainerPhotoORM]]:
        if not container_ids:
            return {}
        rows = (await self.session.execute(
            select(TripContainerPhotoORM)
            .where(TripContainerPhotoORM.trip_container_id.in_(container_ids))
            .order_by(TripContainerPhotoORM.id.asc())
        )).scalars().all()
        out: dict[int, list[TripContainerPhotoORM]] = defaultdict(list)
        for p in rows:
            out[p.trip_container_id].append(p)
        return out

    async def _matched_wo_ids(self, tid: int) -> list[int]:
        rows = (await self.session.execute(
            select(TripOrderWorkOrderORM.work_order_id)
            .where(TripOrderWorkOrderORM.trip_order_id == tid)
        )).all()
        return [r[0] for r in rows]

    async def _hydrate(self, orm: TripOrderORM) -> TripOrder:
        containers = await self._containers_for(orm.id)
        photos = await self._photos_for_containers([c.id for c in containers])
        matched = await self._matched_wo_ids(orm.id)
        return trip_order_to_domain(orm, containers, photos, matched)

    async def get_by_id(self, tid: TripOrderId) -> TripOrder | None:
        orm = (await self.session.execute(
            select(TripOrderORM).where(TripOrderORM.id == int(tid))
        )).scalar_one_or_none()
        return await self._hydrate(orm) if orm else None

    async def find_by_code(self, code: str) -> TripOrder | None:
        orm = (await self.session.execute(
            select(TripOrderORM).where(TripOrderORM.code == code)
        )).scalar_one_or_none()
        return await self._hydrate(orm) if orm else None

    async def list(
        self,
        *,
        offset: int,
        limit: int,
        partner_id: int | None = None,
        status: TripOrderStatus | None = None,
        trip_date_from: date | None = None,
        trip_date_to: date | None = None,
        unpriced_only: bool = False,
    ) -> tuple[Sequence[TripOrder], int]:
        q = select(TripOrderORM)
        if partner_id is not None:
            q = q.where(TripOrderORM.partner_id == partner_id)
        if status is not None:
            q = q.where(TripOrderORM.status == str(status))
        if trip_date_from is not None:
            q = q.where(TripOrderORM.trip_date >= trip_date_from)
        if trip_date_to is not None:
            q = q.where(TripOrderORM.trip_date <= trip_date_to)
        if unpriced_only:
            q = q.where((TripOrderORM.unit_price == 0) | (TripOrderORM.unit_price.is_(None)))
        total = await self.session.scalar(
            select(func.count()).select_from(q.subquery())
        ) or 0
        q = q.order_by(TripOrderORM.id.desc()).offset(offset).limit(limit)
        rows = list((await self.session.execute(q)).scalars().all())
        items = [await self._hydrate(r) for r in rows]
        return items, int(total)

    async def find_duplicate(
        self,
        *,
        partner_id: int,
        trip_date: date,
        container_number: str,
    ) -> TripOrder | None:
        q = (
            select(TripOrderORM)
            .join(
                TripOrderContainerORM,
                TripOrderContainerORM.trip_order_id == TripOrderORM.id,
            )
            .where(
                TripOrderORM.partner_id == partner_id,
                TripOrderORM.trip_date == trip_date,
                TripOrderContainerORM.container_number == container_number,
            )
            .limit(1)
        )
        orm = (await self.session.execute(q)).scalars().first()
        return await self._hydrate(orm) if orm else None

    async def add(self, t: TripOrder) -> TripOrder:
        orm = trip_order_to_orm(t)
        self.session.add(orm)
        await self.session.flush()
        # Containers
        for c in t.containers:
            c_orm = trip_container_to_orm(c)
            c_orm.trip_order_id = orm.id
            self.session.add(c_orm)
        await self.session.flush()
        # Matched WO links
        for wo_id in t.matched_work_order_ids:
            self.session.add(TripOrderWorkOrderORM(
                trip_order_id=orm.id, work_order_id=int(wo_id),
            ))
        await self.session.flush()
        return await self._hydrate(orm)

    async def save(self, t: TripOrder) -> TripOrder:
        existing = (await self.session.execute(
            select(TripOrderORM).where(TripOrderORM.id == int(t.id))
        )).scalar_one()
        trip_order_to_orm(t, existing)

        # Reconcile containers by id (existing rows updated, new ones added,
        # missing ones deleted).
        existing_containers = await self._containers_for(existing.id)
        existing_by_id = {c.id: c for c in existing_containers}
        keep_ids: set[int] = set()
        for c in t.containers:
            if c.id is not None and int(c.id) in existing_by_id:
                trip_container_to_orm(c, existing_by_id[int(c.id)])
                keep_ids.add(int(c.id))
            else:
                c_orm = trip_container_to_orm(c)
                c_orm.trip_order_id = existing.id
                self.session.add(c_orm)
        for cid, c_orm in existing_by_id.items():
            if cid not in keep_ids:
                await self.session.delete(c_orm)

        # Reconcile matched WO links (replace).
        await self.session.execute(
            sa_delete(TripOrderWorkOrderORM).where(
                TripOrderWorkOrderORM.trip_order_id == existing.id
            )
        )
        for wo_id in t.matched_work_order_ids:
            self.session.add(TripOrderWorkOrderORM(
                trip_order_id=existing.id, work_order_id=int(wo_id),
            ))
        await self.session.flush()

        # Photos: containers themselves manage their photo lists; we
        # only handle additions for newly-flushed photos that don't yet
        # have an id.
        refreshed = await self._containers_for(existing.id)
        existing_container_by_id = {c.id: c for c in refreshed}
        for c in t.containers:
            if c.id is None:
                continue
            row = existing_container_by_id.get(int(c.id))
            if row is None:
                continue
            for p in c.photos:
                if p.id is not None:
                    continue
                p_orm = trip_photo_to_orm(p)
                p_orm.trip_container_id = row.id
                self.session.add(p_orm)
        await self.session.flush()

        return await self._hydrate(existing)

    async def delete(self, tid: TripOrderId) -> None:
        orm = (await self.session.execute(
            select(TripOrderORM).where(TripOrderORM.id == int(tid))
        )).scalar_one_or_none()
        if orm is None:
            return
        await self.session.delete(orm)
        await self.session.flush()


# ── WorkOrder ────────────────────────────────────────────────────


class SqlWorkOrderRepository(WorkOrderRepository):
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def _containers_for(self, wid: int) -> list[WorkOrderContainerORM]:
        rows = (await self.session.execute(
            select(WorkOrderContainerORM)
            .where(WorkOrderContainerORM.work_order_id == wid)
            .order_by(WorkOrderContainerORM.id.asc())
        )).scalars().all()
        return list(rows)

    async def _hydrate(self, orm: WorkOrderORM) -> WorkOrder:
        containers = await self._containers_for(orm.id)
        return work_order_to_domain(orm, containers)

    async def get_by_id(self, wid: WorkOrderId) -> WorkOrder | None:
        orm = (await self.session.execute(
            select(WorkOrderORM).where(WorkOrderORM.id == int(wid))
        )).scalar_one_or_none()
        return await self._hydrate(orm) if orm else None

    async def find_by_code(self, code: str) -> WorkOrder | None:
        orm = (await self.session.execute(
            select(WorkOrderORM).where(WorkOrderORM.code == code)
        )).scalar_one_or_none()
        return await self._hydrate(orm) if orm else None

    async def list(
        self,
        *,
        offset: int,
        limit: int,
        partner_id: int | None = None,
        driver_id: int | None = None,
        date_from: date | None = None,
        date_to: date | None = None,
        status: WorkOrderStatus | None = None,
    ) -> tuple[Sequence[WorkOrder], int]:
        q = select(WorkOrderORM)
        if partner_id is not None:
            q = q.where(WorkOrderORM.partner_id == partner_id)
        if driver_id is not None:
            q = q.where(WorkOrderORM.driver_id == driver_id)
        if date_from is not None:
            q = q.where(WorkOrderORM.created_at >= date_from)
        if date_to is not None:
            q = q.where(WorkOrderORM.created_at <= date_to)
        if status is not None:
            q = q.where(WorkOrderORM.status == str(status))
        total = await self.session.scalar(
            select(func.count()).select_from(q.subquery())
        ) or 0
        q = q.order_by(WorkOrderORM.id.desc()).offset(offset).limit(limit)
        rows = list((await self.session.execute(q)).scalars().all())
        items = [await self._hydrate(r) for r in rows]
        return items, int(total)

    async def list_by_ids(
        self, ids: Sequence[WorkOrderId]
    ) -> Sequence[WorkOrder]:
        if not ids:
            return []
        rows = list((await self.session.execute(
            select(WorkOrderORM).where(WorkOrderORM.id.in_([int(i) for i in ids]))
        )).scalars().all())
        return [await self._hydrate(r) for r in rows]

    async def add(self, w: WorkOrder) -> WorkOrder:
        orm = work_order_to_orm(w)
        self.session.add(orm)
        await self.session.flush()
        for c in w.containers:
            c_orm = work_container_to_orm(c)
            c_orm.work_order_id = orm.id
            self.session.add(c_orm)
        await self.session.flush()
        return await self._hydrate(orm)

    async def save(self, w: WorkOrder) -> WorkOrder:
        existing = (await self.session.execute(
            select(WorkOrderORM).where(WorkOrderORM.id == int(w.id))
        )).scalar_one()
        work_order_to_orm(w, existing)
        existing_containers = await self._containers_for(existing.id)
        existing_by_id = {c.id: c for c in existing_containers}
        keep_ids: set[int] = set()
        for c in w.containers:
            if c.id is not None and int(c.id) in existing_by_id:
                work_container_to_orm(c, existing_by_id[int(c.id)])
                keep_ids.add(int(c.id))
            else:
                c_orm = work_container_to_orm(c)
                c_orm.work_order_id = existing.id
                self.session.add(c_orm)
        for cid, c_orm in existing_by_id.items():
            if cid not in keep_ids:
                await self.session.delete(c_orm)
        await self.session.flush()
        return await self._hydrate(existing)

    async def set_status_bulk(
        self, ids: Sequence[WorkOrderId], status: WorkOrderStatus
    ) -> None:
        if not ids:
            return
        rows = (await self.session.execute(
            select(WorkOrderORM).where(WorkOrderORM.id.in_([int(i) for i in ids]))
        )).scalars().all()
        for w in rows:
            w.status = str(status)
        await self.session.flush()
