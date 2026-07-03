"""DeliveredTrip use cases."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta
from app.utils.dates import utcnow

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.pricing_lookup import (
    TripPriceInfo,
    lookup_driver_salaries,
    lookup_vendor_prices,
)
from app.models.vehicle_helpers import (
    resolve_driver_plate,
    resolve_driver_plates_batch,
)
from app.contexts.operations.application.dto import (
    DeliveredTripCreateInput,
    DeliveredTripListFilters,
    DeliveredTripUpdateInput,
    DuplicateCheckCandidate,
    DuplicateCheckRequest,
    DuplicateContainerGroup,
    DuplicateContainersFilters,
)
from app.contexts.operations.domain.entities import DeliveredTrip
from app.contexts.operations.domain.exceptions import (
    AlreadyMatched,
    AlreadyExists,
    NotFound,
)
from app.contexts.operations.domain.repositories import DeliveredTripRepository
from app.contexts.operations.domain.value_objects import (
    DeliveredTripId,
    normalize_work_type,
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
            vendor_id=filters.vendor_id,
            date_from=filters.date_from,
            date_to=filters.date_to,
            matched=filters.matched,
            sort_by=filters.sort_by,
            sort_order=filters.sort_order,
            search=filters.search,
        )
        return list(items), total


class FindDuplicateContainers:
    def __init__(self, repo: DeliveredTripRepository) -> None:
        self.repo = repo

    async def __call__(
        self, filters: DuplicateContainersFilters
    ) -> list[DuplicateContainerGroup]:
        return await self.repo.find_duplicate_containers(
            date_from=filters.date_from,
            date_to=filters.date_to,
            client_id=filters.client_id,
            driver_id=filters.driver_id,
        )


class CheckDeliveredTripDuplicate:
    """Find a driver's existing trips (last 7 days) that look like the trip
    they are about to submit.

    Tier 1 (strongest): identical photo content hash.
    Tier 2: same container (edit distance <= 1) + same pickup + same dropoff
    + same container type. ``work_type`` is deliberately ignored — the same
    physical trip re-tagged with a different tác nghiệp still looks identical
    otherwise, so a near-match here is almost always a duplicate.
    """

    DUPLICATE_LOOKBACK_DAYS = 7

    def __init__(self, repo: DeliveredTripRepository) -> None:
        self.repo = repo

    async def __call__(
        self, request: DuplicateCheckRequest
    ) -> list[DuplicateCheckCandidate]:
        since = date.today() - timedelta(days=self.DUPLICATE_LOOKBACK_DAYS)
        return await self.repo.find_duplicate_candidates(
            driver_id=request.driver_id,
            photo_hash=request.photo_hash,
            cont_number=request.cont_number,
            pickup_location_id=request.pickup_location_id,
            dropoff_location_id=request.dropoff_location_id,
            cont_type=request.cont_type,
            since=since,
            exclude_trip_id=request.exclude_trip_id,
        )


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

        if driver_id is not None and data.cont_photo_hash:
            matches = await self.repo.find_duplicate_candidates(
                driver_id=driver_id,
                photo_hash=data.cont_photo_hash,
            )
            if any(match.photo_match for match in matches):
                raise AlreadyExists(
                    "DeliveredTrip photo",
                    {"cont_photo_hash": data.cont_photo_hash},
                )

        # Auto-resolve vehicle_plate from driver's assignment when not provided
        vehicle_plate = data.vehicle_plate
        if not vehicle_plate and driver_id is not None:
            vehicle_plate = await resolve_driver_plate(self.session, driver_id)

        # Estimate driver salary from RoutePricing at creation time
        trip_info = TripPriceInfo(
            id=-1,
            partner_id=data.vendor_id if data.vendor_id is not None else data.client_id,
            pickup_location_id=data.pickup_location_id,
            dropoff_location_id=data.dropoff_location_id,
            work_type=work_type,
            cont_type=data.cont_type,
        )
        if data.vendor_id is not None:
            prices = await lookup_vendor_prices(self.session, [trip_info])
            estimated_salary = prices.get(-1, 0)
        else:
            salaries = await lookup_driver_salaries(self.session, [trip_info])
            estimated_salary = salaries.get(-1, 0)

        from app.core.pricing_lookup import lookup_client_prices

        client_prices = await lookup_client_prices(self.session, [trip_info])
        estimated_revenue = client_prices.get(-1, 0)

        w = DeliveredTrip(
            id=None,
            client_id=data.client_id,
            pickup_location_id=data.pickup_location_id,
            dropoff_location_id=data.dropoff_location_id,
            driver_id=driver_id,
            vendor_id=data.vendor_id,
            vehicle_plate=vehicle_plate or "",
            vessel=data.vessel,
            work_type=work_type,
            cont_number=data.cont_number,
            cont_type=data.cont_type,
            original_cont_number=data.original_cont_number,
            cont_photo_url=data.cont_photo_url,
            cont_photo_hash=data.cont_photo_hash,
            revenue=estimated_revenue,
            driver_salary=estimated_salary,
            trip_date=data.trip_date if data.trip_date else date.today(),
            original_trip_date=data.trip_date if data.trip_date else date.today(),
            note=data.note,
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
                raise PermissionError("You can only update your own work orders")
            if w.matched:
                raise AlreadyMatched("DeliveredTrip", wid)
        elif user.role not in ("accountant", "director", "superadmin"):
            raise PermissionError("Ban khong co quyen thuc hien thao tac nay")

        if user.role == "driver":
            data.revenue = None
            data.driver_salary = None

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
        if data.cont_photo_url is not None:
            w.cont_photo_url = data.cont_photo_url
        if data.cont_photo_hash is not None:
            if w.driver_id is not None:
                matches = await self.repo.find_duplicate_candidates(
                    driver_id=w.driver_id,
                    photo_hash=data.cont_photo_hash,
                    exclude_trip_id=wid,
                )
                if any(match.photo_match for match in matches):
                    raise AlreadyExists(
                        "DeliveredTrip photo",
                        {"cont_photo_hash": data.cont_photo_hash},
                    )
            w.cont_photo_hash = data.cont_photo_hash
        if data.trip_date is not None:
            w.trip_date = data.trip_date
            if not w.matched:
                w.original_trip_date = data.trip_date
        if data.revenue is not None:
            w.revenue = int(data.revenue)
        if data.driver_salary is not None:
            w.driver_salary = int(data.driver_salary)
        if data.note is not None:
            w.note = data.note or None

        w.updated_at = utcnow()

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
        # Pre-resolve all driver plates in one query to avoid N+1
        items_needing_plate = [item for item in items if not item.vehicle_plate]
        driver_ids_batch = list(
            {
                user.id if user.role == "driver" else item.driver_id
                for item in items_needing_plate
                if (user.id if user.role == "driver" else item.driver_id) is not None
            }
        )
        plate_map = await resolve_driver_plates_batch(self.session, driver_ids_batch)

        # Pre-compute salary estimates for all items in one batch
        own_driver_infos = []
        vendor_infos = []
        for i, item in enumerate(items):
            wt = item.work_type or "CHUYỂN BÃI"
            if wt:
                wt = normalize_work_type(wt)
            info = TripPriceInfo(
                id=i,
                partner_id=item.vendor_id or item.client_id,
                pickup_location_id=item.pickup_location_id,
                dropoff_location_id=item.dropoff_location_id,
                work_type=wt,
                cont_type=item.cont_type,
            )
            if item.vendor_id:
                vendor_infos.append(info)
            else:
                own_driver_infos.append(info)
        salary_map: dict[int, int] = {}
        if vendor_infos:
            salary_map.update(await lookup_vendor_prices(self.session, vendor_infos))
        if own_driver_infos:
            salary_map.update(
                await lookup_driver_salaries(self.session, own_driver_infos)
            )

        from app.core.pricing_lookup import lookup_client_prices

        revenue_map = await lookup_client_prices(
            self.session, vendor_infos + own_driver_infos
        )

        async with self.session.begin():
            for i, item in enumerate(items):
                async with self.session.begin_nested():
                    try:
                        work_type = item.work_type or "CHUYỂN BÃI"
                        if work_type:
                            work_type = normalize_work_type(work_type)
                        driver_id = user.id if user.role == "driver" else item.driver_id
                        # Use pre-resolved plate from batch query
                        batch_plate = item.vehicle_plate or (
                            plate_map.get(driver_id) if driver_id else None
                        )
                        w = DeliveredTrip(
                            id=None,
                            client_id=item.client_id,
                            pickup_location_id=item.pickup_location_id,
                            dropoff_location_id=item.dropoff_location_id,
                            driver_id=driver_id,
                            vendor_id=item.vendor_id,
                            vehicle_plate=batch_plate or "",
                            vessel=item.vessel,
                            work_type=work_type,
                            cont_number=item.cont_number,
                            cont_type=item.cont_type,
                            original_cont_number=item.original_cont_number,
                            revenue=revenue_map.get(i, 0),
                            driver_salary=salary_map.get(i, 0),
                            trip_date=item.trip_date
                            if item.trip_date
                            else date.today(),
                            original_trip_date=item.trip_date
                            if item.trip_date
                            else date.today(),
                            note=item.note,
                        )
                        saved = await self.repo.add(w)
                        saved = await self.repo.save(saved)
                        results.append((i, int(saved.id) if saved.id else None, None))
                    except Exception as exc:
                        results.append((i, None, str(exc)))
        return results
