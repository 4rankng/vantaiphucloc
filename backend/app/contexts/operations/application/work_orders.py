"""WorkOrder use cases."""

from __future__ import annotations

import asyncio
from dataclasses import dataclass
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.contexts.operations.application.dto import (
    WorkOrderContainerInput,
    WorkOrderCreateInput,
    WorkOrderListFilters,
    WorkOrderUpdateInput,
)
from app.contexts.operations.domain.entities import WorkOrder
from app.contexts.operations.domain.exceptions import (
    InvalidStateTransition,
    NotFound,
    WorkOrderLocked,
)
from app.contexts.operations.domain.repositories import WorkOrderRepository
from app.contexts.operations.domain.value_objects import (
    WorkOrderId,
    WorkOrderStatus,
    normalize_work_type,
)
from app.utils.iso6346 import (
    normalize_container_number,
    validate_container_number,
)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _validate_containers(containers: list[WorkOrderContainerInput]) -> None:
    for c in containers:
        valid, error = validate_container_number(c.container_number)
        if not valid:
            raise ValueError(
                f"Số container không hợp lệ: {c.container_number} — {error}"
            )


async def _add_containers(
    w: WorkOrder, containers: list[WorkOrderContainerInput]
) -> None:
    from app.services.photo_storage import save_base64_photo

    for c in containers:
        photo_url = c.photo_url
        if photo_url and photo_url.startswith("data:"):
            photo_url = await asyncio.to_thread(save_base64_photo, photo_url)
        w.add_container(
            container_number=normalize_container_number(c.container_number),
            work_type=c.work_type,
            photo_url=photo_url,
            photo_lat=c.photo_lat,
            photo_lng=c.photo_lng,
            photo_timestamp=c.photo_timestamp,
        )


# ── Reads ────────────────────────────────────────────────────────


class GetWorkOrder:
    def __init__(self, repo: WorkOrderRepository) -> None:
        self.repo = repo

    async def __call__(self, wid: int) -> WorkOrder:
        w = await self.repo.get_by_id(WorkOrderId(wid))
        if w is None:
            raise NotFound("WorkOrder", wid)
        return w


class ListWorkOrders:
    def __init__(self, repo: WorkOrderRepository) -> None:
        self.repo = repo

    async def __call__(
        self, filters: WorkOrderListFilters
    ) -> tuple[list[WorkOrder], int]:
        from app.contexts.operations.infrastructure.orm import WorkOrderORM
        from sqlalchemy import select, func

        offset = (filters.page - 1) * filters.page_size

        # The base repo doesn't expose tractor_plate / created_at filters,
        # so build the query directly here. Mirrors legacy behaviour 1:1.
        session = self.repo.session  # type: ignore[attr-defined]
        q = select(WorkOrderORM)
        if filters.driver_id is not None:
            q = q.where(WorkOrderORM.driver_id == filters.driver_id)
        if filters.tractor_plate is not None:
            q = q.where(WorkOrderORM.tractor_plate == filters.tractor_plate)
        if filters.date_from is not None:
            q = q.where(WorkOrderORM.created_at >= filters.date_from)
        if filters.date_to is not None:
            q = q.where(WorkOrderORM.created_at <= filters.date_to)
        if filters.status is not None:
            q = q.where(WorkOrderORM.status == filters.status)
        total = await session.scalar(
            select(func.count()).select_from(q.subquery())
        ) or 0
        q = q.order_by(WorkOrderORM.id.desc()).offset(offset).limit(
            filters.page_size
        )
        rows = list((await session.execute(q)).scalars().all())
        items = [
            await self.repo._hydrate(r)  # type: ignore[attr-defined]
            for r in rows
        ]
        return items, int(total)


# ── Writes ───────────────────────────────────────────────────────


@dataclass
class CurrentUserContext:
    """Minimal user context the use cases need without importing the
    legacy User model."""
    id: int
    role: str


class CreateWorkOrder:
    def __init__(
        self,
        repo: WorkOrderRepository,
        session: AsyncSession,
    ) -> None:
        self.repo = repo
        self.session = session

    async def __call__(
        self, data: WorkOrderCreateInput, user: CurrentUserContext
    ) -> WorkOrder:
        from app.contexts.customer_pricing.application.pricing_lookup import (
            find_pricing,
        )
        from app.services.code_service import generate_work_order_code

        _validate_containers(data.containers)

        first = data.containers[0] if data.containers else None
        work_type = first.work_type if first else ""

        driver_id = user.id if user.role == "driver" else data.driver_id

        pricing = await find_pricing(
            self.session,
            client_id=data.client_id,
            work_type=work_type,
            pickup_location_id=data.pickup_location_id,
            dropoff_location_id=data.dropoff_location_id,
        )

        gps_address = (
            None if (data.gps_lat and data.gps_lng) else "Không xác định"
        )

        w = WorkOrder(
            id=None,
            client_id=data.client_id,
            route=data.route,
            pickup_location_id=data.pickup_location_id,
            dropoff_location_id=data.dropoff_location_id,
            driver_id=driver_id,
            tractor_plate=data.tractor_plate,
            unit_price=0,
            driver_salary=0,
            allowance=0,
            earning=0,
            gps_lat=data.gps_lat,
            gps_lng=data.gps_lng,
            gps_address=gps_address,
            pricing_id=pricing.id if pricing else None,
            status=WorkOrderStatus.PENDING,
        )
        await _add_containers(w, data.containers)

        saved = await self.repo.add(w)
        saved.code = await generate_work_order_code(self.session, data.client_id)
        saved = await self.repo.save(saved)

        await self.session.commit()
        return saved


class UpdateWorkOrder:
    def __init__(
        self,
        repo: WorkOrderRepository,
        session: AsyncSession,
    ) -> None:
        self.repo = repo
        self.session = session

    async def __call__(
        self,
        wid: int,
        data: WorkOrderUpdateInput,
        user: CurrentUserContext,
    ) -> WorkOrder:
        w = await self.repo.get_by_id(WorkOrderId(wid))
        if w is None:
            raise NotFound("WorkOrder", wid)

        if user.role == "driver":
            if w.driver_id != user.id:
                raise PermissionError(
                    "You can only update your own work orders"
                )
            if w.status != WorkOrderStatus.PENDING:
                raise InvalidStateTransition(
                    kind="WorkOrder",
                    current=w.status,
                    attempted="update",
                )
        elif user.role not in ("accountant", "director", "superadmin"):
            raise PermissionError("Bạn không có quyền thực hiện thao tác này")

        if w.is_locked:
            raise WorkOrderLocked(int(w.id) if w.id is not None else 0)

        # Strip salary fields for drivers
        if user.role == "driver":
            data.unit_price = None
            data.driver_salary = None
            data.allowance = None
            data.earning = None
            data.status = None

        if data.client_id is not None:
            w.client_id = data.client_id
        if data.route is not None:
            w.route = data.route
        if data.pickup_location_id is not None:
            w.pickup_location_id = data.pickup_location_id
        if data.dropoff_location_id is not None:
            w.dropoff_location_id = data.dropoff_location_id
        if data.driver_id is not None:
            w.driver_id = data.driver_id
        if data.tractor_plate is not None:
            w.tractor_plate = data.tractor_plate
        if data.gps_lat is not None:
            w.gps_lat = data.gps_lat
        if data.gps_lng is not None:
            w.gps_lng = data.gps_lng
        if data.unit_price is not None:
            w.unit_price = int(data.unit_price)
        if data.driver_salary is not None:
            w.driver_salary = int(data.driver_salary)
        if data.allowance is not None:
            w.allowance = int(data.allowance)
        if data.earning is not None:
            w.earning = int(data.earning)
        if data.status is not None:
            w.status = data.status
        w.updated_at = _utcnow()

        if data.containers is not None:
            w.containers = []
            await _add_containers(w, data.containers)

        await self.repo.save(w)
        await self.session.commit()
        return w


class CancelWorkOrder:
    def __init__(
        self,
        repo: WorkOrderRepository,
        session: AsyncSession,
    ) -> None:
        self.repo = repo
        self.session = session

    async def __call__(
        self, wid: int, *, user: CurrentUserContext
    ) -> WorkOrder:
        w = await self.repo.get_by_id(WorkOrderId(wid))
        if w is None:
            raise NotFound("WorkOrder", wid)

        if user.role == "driver" and w.driver_id != user.id:
            raise PermissionError(
                "You can only cancel your own work orders"
            )
        if w.status != WorkOrderStatus.PENDING:
            raise InvalidStateTransition(
                kind="WorkOrder",
                current=w.status,
                attempted=WorkOrderStatus.CANCELLED,
            )
        if w.is_locked:
            raise WorkOrderLocked(int(w.id) if w.id is not None else 0)

        w.cancel()
        await self.repo.save(w)
        await self.session.commit()
        return w


class BatchCreateWorkOrders:
    """Create N WorkOrders, each in its own savepoint so partial
    failures don't roll back the whole batch."""

    def __init__(
        self,
        repo: WorkOrderRepository,
        session: AsyncSession,
    ) -> None:
        self.repo = repo
        self.session = session

    async def __call__(
        self,
        items: list[WorkOrderCreateInput],
        user: CurrentUserContext,
    ) -> list[tuple[int, int | None, str | None]]:
        """Returns [(index, created_id_or_None, error_or_None)] for each item."""
        from app.contexts.customer_pricing.application.pricing_lookup import (
            find_pricing,
        )
        from app.services.code_service import generate_work_order_code

        results: list[tuple[int, int | None, str | None]] = []
        async with self.session.begin():
            for i, item in enumerate(items):
                async with self.session.begin_nested():
                    try:
                        _validate_containers(item.containers)
                        first = item.containers[0] if item.containers else None
                        work_type = first.work_type if first else ""
                        driver_id = (
                            user.id if user.role == "driver" else item.driver_id
                        )
                        pricing = await find_pricing(
                            self.session,
                            client_id=item.client_id,
                            work_type=work_type,
                            pickup_location_id=item.pickup_location_id,
                            dropoff_location_id=item.dropoff_location_id,
                        )
                        gps_address = (
                            None if (item.gps_lat and item.gps_lng)
                            else "Không xác định"
                        )
                        w = WorkOrder(
                            id=None,
                            client_id=item.client_id,
                            route=item.route,
                            pickup_location_id=item.pickup_location_id,
                            dropoff_location_id=item.dropoff_location_id,
                            driver_id=driver_id,
                            tractor_plate=item.tractor_plate,
                            unit_price=0, driver_salary=0,
                            allowance=0, earning=0,
                            gps_lat=item.gps_lat,
                            gps_lng=item.gps_lng,
                            gps_address=gps_address,
                            pricing_id=pricing.id if pricing else None,
                            status=WorkOrderStatus.PENDING,
                        )
                        await _add_containers(w, item.containers)
                        saved = await self.repo.add(w)
                        saved.code = await generate_work_order_code(
                            self.session, item.client_id
                        )
                        saved = await self.repo.save(saved)
                        results.append((i, int(saved.id) if saved.id else None, None))
                    except Exception as exc:
                        results.append((i, None, str(exc)))
        return results
