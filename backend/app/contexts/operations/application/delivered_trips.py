"""DeliveredTrip use cases."""

from __future__ import annotations

import asyncio
from dataclasses import dataclass
from datetime import date, datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.contexts.operations.application.dto import (
    DeliveredTripContainerInput,
    DeliveredTripCreateInput,
    DeliveredTripListFilters,
    DeliveredTripUpdateInput,
)
from app.contexts.operations.domain.entities import DeliveredTrip
from app.contexts.operations.domain.exceptions import (
    InvalidStateTransition,
    NotFound,
)
from app.contexts.operations.domain.repositories import DeliveredTripRepository
from app.contexts.operations.domain.value_objects import (
    DeliveredTripId,
    DeliveredTripStatus,
    normalize_work_type,
)
from app.utils.iso6346 import (
    normalize_container_number,
    validate_container_number,
)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _validate_containers(containers: list[DeliveredTripContainerInput]) -> None:
    for c in containers:
        valid, error = validate_container_number(c.container_number)
        if not valid:
            raise ValueError(
                f"So container khong hop le: {c.container_number} -- {error}"
            )


async def _add_containers(
    w: DeliveredTrip, containers: list[DeliveredTripContainerInput]
) -> None:
    from app.contexts.operations.infrastructure.photo_storage import save_base64_photo

    for c in containers:
        photo_url = c.photo_url
        if photo_url and photo_url.startswith("data:"):
            photo_url = await asyncio.to_thread(save_base64_photo, photo_url)
        w.add_container(
            container_number=normalize_container_number(c.container_number),
            cont_type=c.cont_type,
            photo_url=photo_url,
            photo_lat=c.photo_lat,
            photo_lng=c.photo_lng,
            photo_timestamp=c.photo_timestamp,
        )


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
            date_from=filters.date_from,
            date_to=filters.date_to,
            status=(
                DeliveredTripStatus(filters.status) if filters.status else None
            ),
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
        _validate_containers(data.containers)

        first = data.containers[0] if data.containers else None
        work_type = first.cont_type if first else ""

        # Drivers always create for themselves; accountants/admins specify driver_id or vendor
        driver_id = user.id if user.role == "driver" else data.driver_id

        gps_address = (
            None if (data.gps_lat and data.gps_lng) else "Khong xac dinh"
        )

        w = DeliveredTrip(
            id=None,
            client_id=data.client_id,
            pickup_location_id=data.pickup_location_id,
            dropoff_location_id=data.dropoff_location_id,
            driver_id=driver_id,
            vendor_id=data.vendor_id,
            vehicle_id=data.vehicle_id,
            vessel=data.vessel,
            operation_type=data.operation_type,
            work_type=work_type,
            revenue=0,
            driver_salary=0,
            allowance=0,
            gps_lat=data.gps_lat,
            gps_lng=data.gps_lng,
            gps_address=gps_address,
            trip_date=data.trip_date if data.trip_date else date.today(),
            status=DeliveredTripStatus.PENDING,
        )
        await _add_containers(w, data.containers)

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
            if w.status != DeliveredTripStatus.PENDING:
                raise InvalidStateTransition(
                    kind="DeliveredTrip",
                    current=w.status,
                    attempted="update",
                )
        elif user.role not in ("accountant", "director", "superadmin"):
            raise PermissionError("Ban khong co quyen thuc hien thao tac nay")

        # Strip salary fields for drivers
        if user.role == "driver":
            data.revenue = None
            data.driver_salary = None
            data.allowance = None
            data.status = None

        if data.client_id is not None:
            w.client_id = data.client_id
        if data.pickup_location_id is not None:
            w.pickup_location_id = data.pickup_location_id
        if data.dropoff_location_id is not None:
            w.dropoff_location_id = data.dropoff_location_id
        if data.driver_id is not None:
            w.driver_id = data.driver_id
        if data.vehicle_id is not None:
            w.vehicle_id = data.vehicle_id
        if data.vessel is not None:
            w.vessel = data.vessel
        if data.operation_type is not None:
            w.operation_type = data.operation_type
        if data.vendor_id is not None:
            w.vendor_id = data.vendor_id
        if data.gps_lat is not None:
            w.gps_lat = data.gps_lat
        if data.gps_lng is not None:
            w.gps_lng = data.gps_lng
        if data.revenue is not None:
            w.revenue = int(data.revenue)
        if data.driver_salary is not None:
            w.driver_salary = int(data.driver_salary)
        if data.allowance is not None:
            w.allowance = int(data.allowance)
        if data.status is not None:
            w.status = data.status
        w.updated_at = _utcnow()

        if data.containers is not None:
            w.containers = []
            await _add_containers(w, data.containers)

        await self.repo.save(w)
        await self.session.commit()
        return await self.repo.get_by_id(DeliveredTripId(wid))


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
        """Returns [(index, created_id_or_None, error_or_None)] for each item."""
        results: list[tuple[int, int | None, str | None]] = []
        async with self.session.begin():
            for i, item in enumerate(items):
                async with self.session.begin_nested():
                    try:
                        _validate_containers(item.containers)
                        first = item.containers[0] if item.containers else None
                        work_type = first.cont_type if first else ""
                        driver_id = (
                            user.id if user.role == "driver" else item.driver_id
                        )
                        gps_address = (
                            None if (item.gps_lat and item.gps_lng)
                            else "Khong xac dinh"
                        )
                        w = DeliveredTrip(
                            id=None,
                            client_id=item.client_id,
                            pickup_location_id=item.pickup_location_id,
                            dropoff_location_id=item.dropoff_location_id,
                            driver_id=driver_id,
                            vendor_id=item.vendor_id,
                            vehicle_id=item.vehicle_id,
                            vessel=item.vessel,
                            operation_type=item.operation_type,
                            work_type=work_type,
                            revenue=0, driver_salary=0,
                            allowance=0,
                            gps_lat=item.gps_lat,
                            gps_lng=item.gps_lng,
                            gps_address=gps_address,
                            status=DeliveredTripStatus.PENDING,
                        )
                        await _add_containers(w, item.containers)
                        saved = await self.repo.add(w)
                        saved = await self.repo.save(saved)
                        results.append((i, int(saved.id) if saved.id else None, None))
                    except Exception as exc:
                        results.append((i, None, str(exc)))
        return results
