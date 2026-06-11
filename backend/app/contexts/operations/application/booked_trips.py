"""BookedTrip use cases.

Each use case is a callable class that depends on the domain repository
and (when persistence happens) the AsyncSession for transaction control.
The interface layer wires concrete repos via FastAPI `Depends`.
"""

from __future__ import annotations

from datetime import date
from app.utils.dates import utcnow

from sqlalchemy.ext.asyncio import AsyncSession  # transaction control only

from app.contexts.operations.application.dto import (
    ImportCommitInput,
    ImportCommitResult,
    ImportTripRow,
    BookedTripCreateInput,
    BookedTripListFilters,
    BookedTripUpdateInput,
)
from app.contexts.operations.domain.entities import BookedTrip
from app.contexts.operations.domain.exceptions import (
    NotFound,
)
from app.contexts.operations.domain.repositories import (
    BookedTripRepository,
)
from app.contexts.operations.domain.value_objects import (
    BookedTripId,
)




# ── Reads ────────────────────────────────────────────────────────


class GetBookedTrip:
    def __init__(self, repo: BookedTripRepository) -> None:
        self.repo = repo

    async def __call__(self, tid: int) -> BookedTrip:
        t = await self.repo.get_by_id(BookedTripId(tid))
        if t is None:
            raise NotFound("BookedTrip", tid)
        return t


class ListBookedTrips:
    def __init__(self, repo: BookedTripRepository) -> None:
        self.repo = repo

    async def __call__(
        self, filters: BookedTripListFilters
    ) -> tuple[list[BookedTrip], int]:
        offset = (filters.page - 1) * filters.page_size
        items, total = await self.repo.list(
            offset=offset,
            limit=filters.page_size,
            client_id=filters.client_id,
            trip_date_from=filters.date_from,
            trip_date_to=filters.date_to,
        )
        return list(items), total


# ── Writes ───────────────────────────────────────────────────────


class CreateBookedTrip:
    """Create a BookedTrip from API input."""

    def __init__(
        self,
        repo: BookedTripRepository,
        session: AsyncSession,
    ) -> None:
        self.repo = repo
        self.session = session

    async def __call__(self, data: BookedTripCreateInput) -> BookedTrip:
        t = BookedTrip(
            id=None,
            trip_date=data.trip_date,
            client_id=data.client_id,
            pickup_location_id=data.pickup_location_id,
            dropoff_location_id=data.dropoff_location_id,
            work_type=data.work_type,
            cont_number=data.cont_number,
            cont_type=data.cont_type,
        )

        saved = await self.repo.add(t)
        saved = await self.repo.save(saved)
        await self.session.commit()
        return saved


class UpdateBookedTrip:
    """Apply field updates to a BookedTrip."""

    def __init__(
        self,
        repo: BookedTripRepository,
        session: AsyncSession,
    ) -> None:
        self.repo = repo
        self.session = session

    async def __call__(
        self, tid: int, data: BookedTripUpdateInput
    ) -> BookedTrip:
        t = await self.repo.get_by_id(BookedTripId(tid))
        if t is None:
            raise NotFound("BookedTrip", tid)

        if data.trip_date is not None:
            t.trip_date = data.trip_date
        if data.client_id is not None:
            t.client_id = data.client_id
        if data.pickup_location_id is not None:
            t.pickup_location_id = data.pickup_location_id
        if data.dropoff_location_id is not None:
            t.dropoff_location_id = data.dropoff_location_id
        if data.vessel is not None:
            t.vessel = data.vessel
        if data.vehicle_plate is not None:
            t.vehicle_plate = data.vehicle_plate
        if data.work_type is not None:
            t.work_type = data.work_type
        if data.cont_number is not None:
            t.cont_number = data.cont_number
        if data.cont_type is not None:
            t.cont_type = data.cont_type
        t.updated_at = utcnow()

        await self.repo.save(t)
        await self.session.commit()
        return await self.repo.get_by_id(BookedTripId(tid))


class DeleteBookedTrip:
    def __init__(
        self,
        repo: BookedTripRepository,
        session: AsyncSession,
    ) -> None:
        self.repo = repo
        self.session = session

    async def __call__(self, tid: int) -> None:
        t = await self.repo.get_by_id(BookedTripId(tid))
        if t is None:
            raise NotFound("BookedTrip", tid)
        await self.repo.delete(BookedTripId(tid))
        await self.session.commit()


# ── Bulk import ──────────────────────────────────────────────────


class CreateBookedTripFromImport:
    """Create BookedTrips from the partner-Excel import pipeline.

    Each row becomes one BookedTrip (one container per trip).
    Pricing is auto-applied when the trip is later matched to a DeliveredTrip.

    Idempotent on `(client_id, trip_date, container_number)`.
    """

    def __init__(
        self,
        repo: BookedTripRepository,
        session: AsyncSession,
    ) -> None:
        self.repo = repo
        self.session = session

    async def __call__(self, data: ImportCommitInput) -> ImportCommitResult:
        from app.contexts.customer_pricing.infrastructure.location_resolver import (
            LocationResolverService,
            ResolverSource,
        )
        from app.contexts.operations.infrastructure.import_queries import (
            count_locations,
            fetch_client,
            find_duplicate_trip,
        )
        from app.models.domain import BookedTrip as BookedTripORM

        partner = await fetch_client(self.session, data.client_id)
        if partner is None:
            raise NotFound("Client", data.client_id)

        created = 0
        grouped_trips = 0
        skipped = 0
        locations_review_flagged = 0
        errors: list[str] = []
        created_trip_ids: list[int] = []

        resolver = LocationResolverService(self.session)

        locations_seen_before = await count_locations(self.session)

        # Ensure OperationType records exist for all work_type values, but
        # keep the ORIGINAL value from the Excel — do NOT replace with canonical.
        from app.contexts.operations.infrastructure.operation_type_resolver import (
            OperationTypeResolverService,
        )

        wt_resolver = OperationTypeResolverService(self.session)
        work_type_values = {r.work_type for r in data.rows if r.work_type}
        for wt_name in work_type_values:
            await wt_resolver.resolve_or_create(
                wt_name, source="import", user_id=data.user_id,
            )

        updated = 0

        for idx, r in enumerate(data.rows, start=1):
            try:
                cn = r.container_no
                td = r.trip_date
                if td is None:
                    continue
                existing = await find_duplicate_trip(
                    self.session,
                    client_id=data.client_id,
                    trip_date=td,
                    container_no=cn,
                )
                if existing and not data.overwrite_duplicates:
                    skipped += 1
                    continue

                pickup = r.pickup_location or ""
                dropoff = r.dropoff_location or ""
                cont_type = r.cont_type or f"{r.freight_kind}{r.container_size}" or "E20"
                work_type_val = r.work_type if r.work_type else "CHUYỂN BÃI"

                pickup_loc = None
                dropoff_loc = None
                review_needed = False
                if pickup:
                    p = await resolver.resolve_or_create(
                        pickup, source=ResolverSource.IMPORT,
                        user_id=data.user_id,
                    )
                    pickup_loc = p.location
                    if p.review_needed:
                        review_needed = True
                if dropoff:
                    d = await resolver.resolve_or_create(
                        dropoff, source=ResolverSource.IMPORT,
                        user_id=data.user_id,
                    )
                    dropoff_loc = d.location
                    if d.review_needed:
                        review_needed = True

                if existing:
                    # Update existing trip with new values from Excel
                    existing.work_type = work_type_val
                    existing.cont_type = cont_type
                    existing.vessel = r.vessel or existing.vessel
                    if pickup_loc:
                        existing.pickup_location_id = pickup_loc.id
                    if dropoff_loc:
                        existing.dropoff_location_id = dropoff_loc.id
                    await self.session.flush()
                    created_trip_ids.append(existing.id)
                    updated += 1
                else:
                    trip = BookedTripORM(
                        trip_date=td,
                        client_id=partner.id,
                        pickup_location_id=pickup_loc.id if pickup_loc else None,
                        dropoff_location_id=dropoff_loc.id if dropoff_loc else None,
                        work_type=work_type_val,
                        cont_number=cn,
                        cont_type=cont_type,
                        vessel=r.vessel,
                    )
                    self.session.add(trip)
                    await self.session.flush()
                    created_trip_ids.append(trip.id)
                    created += 1

                if review_needed:
                    locations_review_flagged += 1
            except Exception as exc:
                errors.append(f"Dòng {idx}: Lỗi xử lý — {exc}")

        locations_created = max(
            0, await count_locations(self.session) - locations_seen_before
        )
        await self.session.commit()

        return ImportCommitResult(
            created=created,
            updated=updated,
            grouped_trips=grouped_trips,
            skipped_duplicates=skipped,
            locations_created=locations_created,
            locations_review_flagged=locations_review_flagged,
            errors=errors,
            created_trip_ids=created_trip_ids,
        )


# ── Helpers ──────────────────────────────────────────────────────


def _parse_iso_date(s: object) -> date | None:
    if isinstance(s, date):
        return s
    if not s or not isinstance(s, str):
        return None
    try:
        return date.fromisoformat(s)
    except ValueError:
        return None


def trip_row_from_dict(d: dict) -> ImportTripRow:
    return ImportTripRow(
        container_no=d.get("container_no") or "",
        work_type=d.get("work_type") or "",
        pickup_location=d.get("pickup_location") or "",
        dropoff_location=d.get("dropoff_location") or "",
        trip_date=d.get("trip_date"),
        customer_ref=d.get("customer_ref") or "",
        consignee=d.get("consignee") or "",
        driver_name=d.get("driver_name") or "",
        remarks=d.get("remarks") or "",
    )
