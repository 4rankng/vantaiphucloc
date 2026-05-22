"""BookedTrip use cases.

Each use case is a callable class that depends on the domain repository
and (when persistence happens) the AsyncSession for transaction control.
The interface layer wires concrete repos via FastAPI `Depends`.
"""

from __future__ import annotations

from datetime import date, datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession  # transaction control only

from app.contexts.operations.application.dto import (
    ImportCommitInput,
    ImportCommitResult,
    ImportTripRow,
    TripContainerInput,
    BookedTripCreateInput,
    BookedTripListFilters,
    BookedTripUpdateInput,
)
from app.contexts.operations.domain.entities import BookedTrip
from app.contexts.operations.domain.exceptions import (
    InvalidStateTransition,
    NotFound,
)
from app.contexts.operations.domain.repositories import (
    BookedTripRepository,
    DeliveredTripRepository,
)
from app.contexts.operations.domain.value_objects import (
    BookedTripId,
    BookedTripStatus,
    DeliveredTripStatus,
    normalize_work_type,
)
from app.utils.iso6346 import normalize_container_number


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _add_containers(t: BookedTrip, containers: list[TripContainerInput]) -> None:
    for c in containers:
        t.add_container(
            container_number=normalize_container_number(c.container_number),
            cont_type=c.cont_type,
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
        unpriced_only = filters.unpriced is True
        items, total = await self.repo.list(
            offset=offset,
            limit=filters.page_size,
            client_id=filters.client_id,
            status=DeliveredTripStatus(filters.status) if filters.status else None,
            trip_date_from=filters.date_from,
            trip_date_to=filters.date_to,
            unpriced_only=unpriced_only,
        )
        # `unpriced=False` filter (priced-only) — applied here since the
        # repo signature only encodes `unpriced_only`.
        if filters.unpriced is False:
            items = [t for t in items if (t.revenue or 0) > 0]
        return list(items), total


# ── Writes ───────────────────────────────────────────────────────


class CreateBookedTrip:
    """Create a BookedTrip from API input. Applies tiered pricing if the
    partner has a matching pricing rule for the work_type + quantity."""

    def __init__(
        self,
        repo: BookedTripRepository,
        wo_repo: DeliveredTripRepository,
        session: AsyncSession,
    ) -> None:
        self.repo = repo
        self.wo_repo = wo_repo
        self.session = session

    async def __call__(self, data: BookedTripCreateInput) -> BookedTrip:
        revenue = int(data.revenue or 0)

        if data.containers:
            from app.contexts.customer_pricing.infrastructure.pricing_lookup import (
                find_tiered_pricing,
            )
            wt = normalize_work_type(data.containers[0].cont_type)
            count = sum(
                1 for c in data.containers
                if normalize_work_type(c.cont_type) == wt
            ) or 1
            tiered = await find_tiered_pricing(
                self.session,
                client_id=data.client_id,
                work_type=wt,
                quantity=count,
                pickup_location_id=data.pickup_location_id,
                dropoff_location_id=data.dropoff_location_id,
            )
            if tiered:
                revenue = tiered.revenue

        from app.contexts.operations.domain.value_objects import BookedTripStatus
        t = BookedTrip(
            id=None,
            trip_date=data.trip_date,
            client_id=data.client_id,
            pickup_location_id=data.pickup_location_id,
            dropoff_location_id=data.dropoff_location_id,
            revenue=revenue,
            status=BookedTripStatus.DRAFT if revenue == 0 else BookedTripStatus.PENDING,
        )
        _add_containers(t, data.containers)

        saved = await self.repo.add(t)
        saved = await self.repo.save(saved)

        for wo_id in (data.matched_delivered_trip_ids or []):
            wo = await self.wo_repo.get_by_id(wo_id)  # type: ignore[arg-type]
            if wo is not None and wo.status == DeliveredTripStatus.PENDING:
                wo.match()
                await self.wo_repo.save(wo)

        await self.session.commit()
        return saved


class UpdateBookedTrip:
    """Apply field updates, replace containers/links, propagate WO status."""

    def __init__(
        self,
        repo: BookedTripRepository,
        wo_repo: DeliveredTripRepository,
        session: AsyncSession,
    ) -> None:
        self.repo = repo
        self.wo_repo = wo_repo
        self.session = session

    async def __call__(
        self, tid: int, data: BookedTripUpdateInput
    ) -> BookedTrip:
        t = await self.repo.get_by_id(BookedTripId(tid))
        if t is None:
            raise NotFound("BookedTrip", tid)

        # Scalar fields
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
        if data.operation_type is not None:
            t.operation_type = data.operation_type
        if data.work_type is not None:
            t.work_type = data.work_type
        if data.revenue is not None:
            t.revenue = int(data.revenue)
        if data.driver_salary is not None:
            t.driver_salary = int(data.driver_salary)
        if data.allowance is not None:
            t.allowance = int(data.allowance)
        if data.status is not None:
            t.status = data.status
        t.updated_at = _utcnow()

        # Containers — replace wholesale
        if data.containers is not None:
            t.containers = []
            _add_containers(t, data.containers)

        # Matched WO ids — diff and update WO statuses via Reconciliation table
        from sqlalchemy import select
        from app.models.domain import Reconciliation
        old_matched_rows = (await self.session.execute(
            select(Reconciliation.delivered_trip_id).where(
                Reconciliation.booked_trip_id == tid,
                Reconciliation.is_active == True,  # noqa: E712
            )
        )).scalars().all()
        old_matched = set(int(x) for x in old_matched_rows)
        new_matched: set[int] | None = None
        if data.matched_delivered_trip_ids is not None:
            new_matched = {int(i) for i in data.matched_delivered_trip_ids}

        await self.repo.save(t)

        if new_matched is not None:
            removed = old_matched - new_matched
            added = new_matched - old_matched
            for wo_id in removed:
                wo = await self.wo_repo.get_by_id(wo_id)  # type: ignore[arg-type]
                if wo is not None and wo.status == DeliveredTripStatus.MATCHED:
                    wo.unmatch()
                    await self.wo_repo.save(wo)
            for wo_id in added:
                wo = await self.wo_repo.get_by_id(wo_id)  # type: ignore[arg-type]
                if wo is not None and wo.status == DeliveredTripStatus.PENDING:
                    wo.match()
                    await self.wo_repo.save(wo)

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


# ── Bulk import + apply pricing ──────────────────────────────────


class CreateBookedTripFromImport:
    """Create BookedTrips from the partner-Excel import pipeline.

    Groups rows by (trip_date + dropoff + tractor/partner-ref) so a
    truck running multiple containers becomes one BookedTrip with N
    TripContainer rows. Pricing is intentionally NOT applied here -- the
    accountant prices the trip later via Apply Pricing or manually, so
    every imported trip starts in PENDING.

    Idempotent on `(client_id, trip_date, container_number)`. Returns
    counts plus the new trip ids so the UI can chain the apply-pricing
    flow.
    """

    def __init__(
        self,
        repo: BookedTripRepository,
        session: AsyncSession,
    ) -> None:
        self.repo = repo
        self.session = session

    async def __call__(self, data: ImportCommitInput) -> ImportCommitResult:
        from app.contexts.operations.infrastructure.import_pipeline.pipeline import group_rows_into_trips
        from app.contexts.customer_pricing.infrastructure.location_resolver import (
            LocationResolverService,
            ResolverSource,
        )
        from app.contexts.operations.infrastructure.import_queries import (
            count_locations,
            fetch_client,
            find_duplicate_trip,
        )
        from app.models.domain import (
            BookedTrip as BookedTripORM,
            BookedTripContainer as BookedTripContainerORM,
        )

        partner = await fetch_client(self.session, data.client_id)
        if partner is None:
            raise NotFound("Client", data.client_id)

        rows_as_dicts = [
            {
                "container_no": r.container_no,
                "container_size": r.container_size,
                "container_type": r.container_type_iso,
                "freight_kind": r.freight_kind,
                "work_type": r.work_type,
                "gross_weight_kg": r.gross_weight_kg,
                "seal_no": r.seal_no,
                "commodity": r.commodity,
                "pickup_location": r.pickup_location,
                "dropoff_location": r.dropoff_location,
                "trip_date": r.trip_date.isoformat() if r.trip_date else None,
                "driver_name": r.driver_name,
                "customer_ref": r.customer_ref,
                "remarks": r.remarks,
            }
            for r in data.rows
        ]
        groups = group_rows_into_trips(rows_as_dicts)

        created = 0
        containers_created = 0
        grouped_trips = 0
        skipped = 0
        locations_review_flagged = 0
        errors: list[str] = []
        created_trip_ids: list[int] = []

        resolver = LocationResolverService(self.session)

        locations_seen_before = await count_locations(self.session)

        for idx, grp in enumerate(groups, start=1):
            try:
                new_rows = []
                for v in grp.rows:
                    cn = v.get("container_no", "")
                    td = _parse_iso_date(v.get("trip_date"))
                    if td is None:
                        continue
                    existing = await find_duplicate_trip(
                        self.session,
                        client_id=data.client_id,
                        trip_date=td,
                        container_no=cn,
                    )
                    if existing:
                        if data.overwrite_duplicates:
                            new_rows.append(v)
                        else:
                            skipped += 1
                    else:
                        new_rows.append(v)
                if not new_rows:
                    continue

                first = new_rows[0]
                trip_date = (
                    _parse_iso_date(first.get("trip_date"))
                    or _parse_iso_date(grp.trip_date)
                )
                pickup = grp.pickup_location or first.get("pickup_location") or ""
                dropoff = grp.dropoff_location or first.get("dropoff_location") or ""
                work_type = first.get("work_type") or ""

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

                if not pickup_loc or not dropoff_loc:
                    errors.append(
                        f"Nhom {idx}: pickup/dropoff khong the giai quyet "
                        f"(pickup={pickup!r}, dropoff={dropoff!r})"
                    )
                    continue

                trip = BookedTripORM(
                    trip_date=trip_date,
                    client_id=partner.id,
                    pickup_location_id=pickup_loc.id,
                    dropoff_location_id=dropoff_loc.id,
                    revenue=0,
                    work_type=work_type,
                    status=DeliveredTripStatus.PENDING.value,
                )
                if review_needed:
                    locations_review_flagged += 1
                self.session.add(trip)
                await self.session.flush()
                created_trip_ids.append(trip.id)

                for v in new_rows:
                    self.session.add(BookedTripContainerORM(
                        booked_trip_id=trip.id,
                        container_number=v.get("container_no") or "",
                        cont_type=v.get("work_type") or work_type,
                    ))
                    containers_created += 1

                created += 1
                if len(new_rows) > 1:
                    grouped_trips += 1
            except Exception as exc:
                errors.append(f"Nhom {idx}: {exc}")

        locations_created = max(
            0, await count_locations(self.session) - locations_seen_before
        )
        await self.session.commit()

        return ImportCommitResult(
            created=created,
            containers_created=containers_created,
            grouped_trips=grouped_trips,
            skipped_duplicates=skipped,
            locations_created=locations_created,
            locations_review_flagged=locations_review_flagged,
            errors=errors,
            created_trip_ids=created_trip_ids,
        )


class ApplyPricingToTrips:
    """Bulk-apply tiered pricing to a set of BookedTrips.

    `skip_already_priced=True` makes the call idempotent — re-running
    the same set is a no-op for trips already priced.
    """

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def __call__(
        self,
        *,
        client_id: int | None,
        trip_ids: list[int] | None,
        skip_already_priced: bool,
    ) -> tuple[int, list[int]]:
        from app.contexts.customer_pricing.infrastructure.pricing_lookup import (
            find_tiered_pricing,
        )
        from app.contexts.operations.infrastructure.import_queries import (
            count_containers_for_trip,
            first_container_work_type,
            list_unpriced_trips,
        )

        rows = await list_unpriced_trips(
            self.session,
            client_id=client_id,
            trip_ids=trip_ids,
        )

        priced = 0
        unpriced_ids: list[int] = []
        for trip in rows:
            if skip_already_priced and trip.revenue and trip.revenue > 0:
                priced += 1
                continue
            cont_count = (
                await count_containers_for_trip(self.session, trip.id) or 1
            )
            wt = (
                await first_container_work_type(self.session, trip.id) or ""
            )
            if not wt:
                unpriced_ids.append(trip.id)
                continue
            tiered = await find_tiered_pricing(
                self.session,
                client_id=trip.client_id,
                work_type=wt,
                quantity=int(cont_count),
                pickup_location_id=trip.pickup_location_id,
                dropoff_location_id=trip.dropoff_location_id,
            )
            if tiered is None:
                unpriced_ids.append(trip.id)
                continue
            trip.revenue = tiered.revenue
            priced += 1

        await self.session.commit()
        return priced, unpriced_ids


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


def _to_float(v: object) -> float | None:
    if v is None or v == "":
        return None
    try:
        return float(v)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return None


_CONTAINER_DIRECT_FIELDS = {
    "container_no", "container_size", "container_type", "freight_kind",
    "work_type", "gross_weight_kg", "seal_no", "commodity",
    "pickup_location", "dropoff_location", "trip_date",
    "driver_name", "customer_ref",
}


def _extract_metadata(row: dict[str, object]) -> dict[str, object] | None:
    extras = {
        k: v
        for k, v in row.items()
        if k not in _CONTAINER_DIRECT_FIELDS
        and v not in (None, "", [], {})
    }
    return extras or None


def trip_row_from_dict(d: dict) -> ImportTripRow:
    return ImportTripRow(
        container_no=d.get("container_no") or "",
        container_size=d.get("container_size") or "",
        freight_kind=d.get("freight_kind") or "",
        work_type=d.get("work_type") or "",
        container_type_iso=d.get("container_type_iso") or "",
        gross_weight_kg=d.get("gross_weight_kg"),
        seal_no=d.get("seal_no") or "",
        commodity=d.get("commodity") or "",
        pickup_location=d.get("pickup_location") or "",
        dropoff_location=d.get("dropoff_location") or "",
        trip_date=d.get("trip_date"),
        customer_ref=d.get("customer_ref") or "",
        consignee=d.get("consignee") or "",
        driver_name=d.get("driver_name") or "",
        remarks=d.get("remarks") or "",
    )


class CancelBookedTrip:
    """Cancel a BookedTrip."""

    def __init__(self, to_repo: BookedTripRepository, session: AsyncSession) -> None:
        self.to_repo = to_repo
        self.session = session

    async def __call__(self, booked_trip_id: int) -> BookedTrip:
        from app.contexts.operations.domain.value_objects import BookedTripStatus
        to = await self.to_repo.get_by_id(booked_trip_id)
        if to is None:
            raise NotFound("BookedTrip", booked_trip_id)
        to.status = BookedTripStatus.CANCELLED
        await self.to_repo.save(to)
        await self.session.commit()
        return to


class ConfirmBookedTrip:
    """Confirm a BookedTrip — permanent, flips to CONFIRMED status.
    Also completes any matched DeliveredTrips."""

    def __init__(
        self,
        to_repo: BookedTripRepository,
        wo_repo: DeliveredTripRepository,
        session: AsyncSession,
    ) -> None:
        self.to_repo = to_repo
        self.wo_repo = wo_repo
        self.session = session

    async def __call__(self, booked_trip_id: int, *, user_id: int = 0) -> BookedTrip:
        from app.contexts.operations.domain.value_objects import BookedTripStatus, DeliveredTripStatus

        to = await self.to_repo.get_by_id(booked_trip_id)
        if to is None:
            raise NotFound("BookedTrip", booked_trip_id)
        to.status = BookedTripStatus.CONFIRMED
        await self.to_repo.save(to)

        # Complete all matched DeliveredTrips via Reconciliation
        from sqlalchemy import select
        from app.models.domain import Reconciliation
        matched_wo_ids = (await self.session.execute(
            select(Reconciliation.delivered_trip_id).where(
                Reconciliation.booked_trip_id == booked_trip_id,
                Reconciliation.is_active == True,  # noqa: E712
            )
        )).scalars().all()
        for wo_id in matched_wo_ids:
            wo = await self.wo_repo.get_by_id(int(wo_id))
            if wo is not None:
                wo.status = DeliveredTripStatus.COMPLETED
                await self.wo_repo.save(wo)

        await self.session.commit()
        return to
