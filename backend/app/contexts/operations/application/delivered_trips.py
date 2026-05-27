"""DeliveredTrip use cases."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.contexts.operations.application.dto import (
    DeliveredTripCreateInput,
    DeliveredTripListFilters,
    DeliveredTripUpdateInput,
)
from app.contexts.operations.domain.entities import DeliveredTrip
from app.contexts.operations.domain.exceptions import (
    AlreadyMatched,
    NotFound,
)
from app.contexts.operations.domain.repositories import DeliveredTripRepository
from app.contexts.operations.domain.value_objects import (
    DeliveredTripId,
    normalize_work_type,
)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


# ── Reads ────────────────────────────────────────────────────────


class GetDeliveredTrip:
    def __init__(self, repo: DeliveredTripRepository) -> None:
        self.repo = repo

    async def __call__(self, wid: int) -> DeliveredTrip:
        w = await self.repo.get_by_id(DeliveredTripId(wid))
        if w is None:
            raise NotFound("DeliveredTrip", wid)
        return w


class ListDeliveredTrips:
    def __init__(self, repo: DeliveredTripRepository) -> None:
        self.repo = repo

    async def __call__(
        self, filters: DeliveredTripListFilters
    ) -> tuple[list[DeliveredTrip], int]:
        offset = (filters.page - 1) * filters.page_size
        items, total = await self.repo.list(
            offset=offset,
            limit=filters.page_size,
            client_id=filters.client_id,
            driver_id=filters.driver_id,
            vendor_id=filters.vendor_id,
            date_from=filters.date_from,
            date_to=filters.date_to,
            matched=filters.matched,
            sort_by=filters.sort_by,
            sort_order=filters.sort_order,
            search=filters.search,
        )
        return list(items), total


# ── Writes ───────────────────────────────────────────────────────


@dataclass
class CurrentUserContext:
    """Minimal user context the use cases need without importing the
    legacy User model."""
    id: int
    role: str


class CreateDeliveredTrip:
    def __init__(
        self,
        repo: DeliveredTripRepository,
        session: AsyncSession,
    ) -> None:
        self.repo = repo
        self.session = session

    async def __call__(
        self, data: DeliveredTripCreateInput, user: CurrentUserContext
    ) -> DeliveredTrip:
        work_type = data.work_type or "CHUYỂN BÃI"
        if work_type:
            work_type = normalize_work_type(work_type)

        driver_id = user.id if user.role == "driver" else data.driver_id

        w = DeliveredTrip(
            id=None,
            client_id=data.client_id,
            pickup_location_id=data.pickup_location_id,
            dropoff_location_id=data.dropoff_location_id,
            driver_id=driver_id,
            vendor_id=data.vendor_id,
            vehicle_plate=data.vehicle_plate or "",
            vessel=data.vessel,
            work_type=work_type,
            cont_number=data.cont_number,
            cont_type=data.cont_type,
            revenue=0,
            driver_salary=0,
            trip_date=data.trip_date if data.trip_date else date.today(),
        )

        saved = await self.repo.add(w)
        saved = await self.repo.save(saved)
        await self.session.commit()
        return saved


class UpdateDeliveredTrip:
    def __init__(
        self,
        repo: DeliveredTripRepository,
        session: AsyncSession,
    ) -> None:
        self.repo = repo
        self.session = session

    async def __call__(
        self,
        wid: int,
        data: DeliveredTripUpdateInput,
        user: CurrentUserContext,
    ) -> DeliveredTrip:
        w = await self.repo.get_by_id(DeliveredTripId(wid))
        if w is None:
            raise NotFound("DeliveredTrip", wid)

        if user.role == "driver":
            if w.driver_id != user.id:
                raise PermissionError(
                    "You can only update your own work orders"
                )
            if w.matched:
                raise AlreadyMatched("DeliveredTrip", wid)
        elif user.role not in ("accountant", "director", "superadmin"):
            raise PermissionError("Ban khong co quyen thuc hien thao tac nay")

        if user.role == "driver":
            data.revenue = None
            data.driver_salary = None

        criteria_changed = any([
            data.client_id is not None and data.client_id != w.client_id,
            data.pickup_location_id is not None and data.pickup_location_id != w.pickup_location_id,
            data.dropoff_location_id is not None and data.dropoff_location_id != w.dropoff_location_id,
            data.driver_id is not None and data.driver_id != w.driver_id,
            data.vehicle_plate is not None and data.vehicle_plate != w.vehicle_plate,
            data.vessel is not None and data.vessel != w.vessel,
            data.vendor_id is not None and data.vendor_id != w.vendor_id,
            data.work_type is not None and data.work_type != w.work_type,
            data.cont_number is not None and data.cont_number != w.cont_number,
            data.cont_type is not None and data.cont_type != w.cont_type,
        ])

        if data.client_id is not None:
            w.client_id = data.client_id
        if data.pickup_location_id is not None:
            w.pickup_location_id = data.pickup_location_id
        if data.dropoff_location_id is not None:
            w.dropoff_location_id = data.dropoff_location_id
        if data.driver_id is not None:
            w.driver_id = data.driver_id
        if data.vehicle_plate is not None:
            w.vehicle_plate = data.vehicle_plate
        if data.vessel is not None:
            w.vessel = data.vessel
        if data.vendor_id is not None:
            w.vendor_id = data.vendor_id
        if data.work_type is not None:
            w.work_type = data.work_type
        if data.cont_number is not None:
            w.cont_number = data.cont_number
        if data.cont_type is not None:
            w.cont_type = data.cont_type
        if data.revenue is not None:
            w.revenue = int(data.revenue)
        if data.driver_salary is not None:
            w.driver_salary = int(data.driver_salary)

        if criteria_changed and w.booked_trip_id is not None:
            w.booked_trip_id = None

        w.updated_at = _utcnow()

        await self.repo.save(w)
        await self.session.commit()
        return await self.repo.get_by_id(DeliveredTripId(wid))


class DeleteDeliveredTrip:
    def __init__(
        self,
        repo: DeliveredTripRepository,
        session: AsyncSession,
    ) -> None:
        self.repo = repo
        self.session = session

    async def __call__(self, wid: int, user: CurrentUserContext) -> None:
        w = await self.repo.get_by_id(DeliveredTripId(wid))
        if w is None:
            raise NotFound("DeliveredTrip", wid)

        if user.role == "driver":
            if w.driver_id != user.id:
                raise PermissionError("You can only delete your own work orders")
            if w.matched:
                raise AlreadyMatched("DeliveredTrip", wid)
        elif user.role not in ("accountant", "director", "superadmin"):
            raise PermissionError("Ban khong co quyen thuc hien thao tac nay")

        await self.repo.delete(DeliveredTripId(wid))
        await self.session.commit()


class BatchCreateDeliveredTrips:
    """Create N DeliveredTrips, each in its own savepoint so partial
    failures don't roll back the whole batch."""

    def __init__(
        self,
        repo: DeliveredTripRepository,
        session: AsyncSession,
    ) -> None:
        self.repo = repo
        self.session = session

    async def __call__(
        self,
        items: list[DeliveredTripCreateInput],
        user: CurrentUserContext,
    ) -> list[tuple[int, int | None, str | None]]:
        results: list[tuple[int, int | None, str | None]] = []
        async with self.session.begin():
            for i, item in enumerate(items):
                async with self.session.begin_nested():
                    try:
                        work_type = item.work_type or "CHUYỂN BÃI"
                        if work_type:
                            work_type = normalize_work_type(work_type)
                        driver_id = (
                            user.id if user.role == "driver" else item.driver_id
                        )
                        w = DeliveredTrip(
                            id=None,
                            client_id=item.client_id,
                            pickup_location_id=item.pickup_location_id,
                            dropoff_location_id=item.dropoff_location_id,
                            driver_id=driver_id,
                            vendor_id=item.vendor_id,
                            vehicle_plate=item.vehicle_plate or "",
                            vessel=item.vessel,
                            work_type=work_type,
                            cont_number=item.cont_number,
                            cont_type=item.cont_type,
                            revenue=0, driver_salary=0,
                        )
                        saved = await self.repo.add(w)
                        saved = await self.repo.save(saved)
                        results.append((i, int(saved.id) if saved.id else None, None))
                    except Exception as exc:
                        results.append((i, None, str(exc)))
        return results
