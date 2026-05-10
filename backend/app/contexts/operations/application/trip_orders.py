"""TripOrder use cases.

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
    TripOrderCreateInput,
    TripOrderListFilters,
    TripOrderUpdateInput,
)
from app.contexts.operations.domain.entities import TripOrder
from app.contexts.operations.domain.exceptions import (
    InvalidStateTransition,
    NotFound,
    TripOrderLocked,
)
from app.contexts.operations.domain.repositories import (
    TripOrderRepository,
    WorkOrderRepository,
)
from app.contexts.operations.domain.value_objects import (
    TripOrderId,
    TripOrderStatus,
    WorkOrderStatus,
    normalize_work_type,
)
from app.utils.iso6346 import normalize_container_number


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _add_containers(t: TripOrder, containers: list[TripContainerInput]) -> None:
    for c in containers:
        t.add_container(
            container_number=normalize_container_number(c.container_number),
            work_type=c.work_type,
            container_size=c.container_size,
            container_type=c.container_type,
            freight_kind=c.freight_kind,
            gross_weight_kg=c.gross_weight_kg,
            seal_no=c.seal_no,
            commodity=c.commodity,
            container_metadata=c.container_metadata,
        )


# ── Reads ────────────────────────────────────────────────────────


class GetTripOrder:
    def __init__(self, repo: TripOrderRepository) -> None:
        self.repo = repo

    async def __call__(self, tid: int) -> TripOrder:
        t = await self.repo.get_by_id(TripOrderId(tid))
        if t is None:
            raise NotFound("TripOrder", tid)
        return t


class ListTripOrders:
    def __init__(self, repo: TripOrderRepository) -> None:
        self.repo = repo

    async def __call__(
        self, filters: TripOrderListFilters
    ) -> tuple[list[TripOrder], int]:
        offset = (filters.page - 1) * filters.page_size
        unpriced_only = filters.unpriced is True
        items, total = await self.repo.list(
            offset=offset,
            limit=filters.page_size,
            client_id=filters.client_id,
            status=TripOrderStatus(filters.status) if filters.status else None,
            trip_date_from=filters.date_from,
            trip_date_to=filters.date_to,
            unpriced_only=unpriced_only,
        )
        # `unpriced=False` filter (priced-only) — applied here since the
        # repo signature only encodes `unpriced_only`.
        if filters.unpriced is False:
            items = [t for t in items if (t.unit_price or 0) > 0]
        return list(items), total


# ── Writes ───────────────────────────────────────────────────────


class CreateTripOrder:
    """Create a TripOrder from API input. Applies tiered pricing if the
    customer has a matching pricing rule for the route + work_type +
    quantity."""

    def __init__(
        self,
        repo: TripOrderRepository,
        wo_repo: WorkOrderRepository,
        session: AsyncSession,
    ) -> None:
        self.repo = repo
        self.wo_repo = wo_repo
        self.session = session

    async def __call__(self, data: TripOrderCreateInput) -> TripOrder:
        from app.contexts.customer_pricing.infrastructure.pricing_lookup import (
            find_tiered_pricing,
        )
        from app.contexts.operations.infrastructure.codes import generate_trip_order_code

        unit_price = int(data.unit_price or 0)
        driver_salary = int(data.driver_salary or 0)
        allowance = int(data.allowance or 0)
        revenue = int(data.revenue or unit_price)
        pricing_id = data.pricing_id

        if data.containers:
            wt = normalize_work_type(data.containers[0].work_type)
            count = sum(
                1 for c in data.containers
                if normalize_work_type(c.work_type) == wt
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
                unit_price = tiered.unit_price
                driver_salary = tiered.driver_salary
                allowance = tiered.allowance
                pricing_id = tiered.pricing.id
                revenue = tiered.unit_price

        has_containers = bool(data.containers)
        has_pricing = unit_price > 0 and driver_salary > 0
        status = (
            TripOrderStatus.PENDING if (has_containers and has_pricing)
            else TripOrderStatus.DRAFT
        )

        t = TripOrder(
            id=None,
            trip_date=data.trip_date,
            client_id=data.client_id,
            route=data.route,
            pickup_location_id=data.pickup_location_id,
            dropoff_location_id=data.dropoff_location_id,
            unit_price=unit_price,
            driver_salary=driver_salary,
            allowance=allowance,
            revenue=revenue,
            pricing_id=pricing_id,
            status=status,
            matched_work_order_ids=list(data.matched_work_order_ids or []),
        )
        _add_containers(t, data.containers)

        saved = await self.repo.add(t)

        # Generate code now that the row is flushed.
        saved.code = await generate_trip_order_code(self.session, data.client_id)
        saved = await self.repo.save(saved)

        # Mark linked WOs as MATCHED — separate aggregate.
        for wo_id in saved.matched_work_order_ids:
            wo = await self.wo_repo.get_by_id(wo_id)  # type: ignore[arg-type]
            if wo is not None and wo.status == WorkOrderStatus.PENDING:
                wo.match()
                await self.wo_repo.save(wo)

        await self.session.commit()
        return saved


class UpdateTripOrder:
    """Apply field updates, replace containers/links, propagate WO status."""

    def __init__(
        self,
        repo: TripOrderRepository,
        wo_repo: WorkOrderRepository,
        session: AsyncSession,
        client_repo: "ClientRepository | None" = None,
    ) -> None:
        self.repo = repo
        self.wo_repo = wo_repo
        self.session = session
        self.client_repo = client_repo

    async def __call__(
        self, tid: int, data: TripOrderUpdateInput
    ) -> TripOrder:
        t = await self.repo.get_by_id(TripOrderId(tid))
        if t is None:
            raise NotFound("TripOrder", tid)

        if t.is_locked:
            raise TripOrderLocked(int(t.id) if t.id is not None else 0)
        if t.is_confirmed:
            raise InvalidStateTransition(
                kind="TripOrder", current="confirmed", attempted="update",
            )

        # Scalar fields
        if data.trip_date is not None:
            t.trip_date = data.trip_date
        if data.client_id is not None:
            t.client_id = data.client_id
        if data.route is not None:
            t.route = data.route
        if data.pickup_location_id is not None:
            t.pickup_location_id = data.pickup_location_id
        if data.dropoff_location_id is not None:
            t.dropoff_location_id = data.dropoff_location_id
        if data.pricing_id is not None:
            t.pricing_id = data.pricing_id
        if data.unit_price is not None:
            t.unit_price = int(data.unit_price)
        if data.driver_salary is not None:
            t.driver_salary = int(data.driver_salary)
        if data.allowance is not None:
            t.allowance = int(data.allowance)
        if data.revenue is not None:
            t.revenue = int(data.revenue)
        if data.status is not None:
            t.status = data.status
        t.updated_at = _utcnow()

        # Containers — replace wholesale
        if data.containers is not None:
            t.containers = []
            _add_containers(t, data.containers)

        # Matched WO ids — diff and update WO statuses
        old_matched = set(t.matched_work_order_ids)
        new_matched: set[int] | None = None
        if data.matched_work_order_ids is not None:
            new_matched = {int(i) for i in data.matched_work_order_ids}
            t.matched_work_order_ids = sorted(new_matched)

        await self.repo.save(t)

        if new_matched is not None:
            removed = old_matched - new_matched
            added = new_matched - old_matched
            for wo_id in removed:
                wo = await self.wo_repo.get_by_id(wo_id)  # type: ignore[arg-type]
                if wo is not None and wo.status == WorkOrderStatus.MATCHED:
                    wo.unmatch()
                    await self.wo_repo.save(wo)
            for wo_id in added:
                wo = await self.wo_repo.get_by_id(wo_id)  # type: ignore[arg-type]
                if wo is not None and wo.status == WorkOrderStatus.PENDING:
                    wo.match()
                    await self.wo_repo.save(wo)

            # Cross-context: bump customer outstanding debt when first
            # match goes onto a priced trip. Mirrors legacy behaviour.
            if t.unit_price > 0 and added and not old_matched:
                from app.contexts.customer_pricing.infrastructure.client_legacy_repo import ClientRepository
                client_repo = ClientRepository(session=self.session)
                await client_repo.increment_debt(t.client_id, t.unit_price)

        await self.session.commit()
        return await self.repo.get_by_id(TripOrderId(tid))


class CancelTripOrder:
    def __init__(
        self,
        repo: TripOrderRepository,
        session: AsyncSession,
    ) -> None:
        self.repo = repo
        self.session = session

    async def __call__(self, tid: int) -> TripOrder:
        t = await self.repo.get_by_id(TripOrderId(tid))
        if t is None:
            raise NotFound("TripOrder", tid)
        if t.is_locked:
            raise TripOrderLocked(int(t.id) if t.id is not None else 0)
        t.cancel()
        await self.repo.save(t)
        await self.session.commit()
        return t


class ConfirmTripOrder:
    """Toggle TripOrder confirmation. When confirming, marks all matched
    WorkOrders as COMPLETED."""

    def __init__(
        self,
        repo: TripOrderRepository,
        wo_repo: WorkOrderRepository,
        session: AsyncSession,
    ) -> None:
        self.repo = repo
        self.wo_repo = wo_repo
        self.session = session

    async def __call__(self, tid: int, *, user_id: int) -> TripOrder:
        t = await self.repo.get_by_id(TripOrderId(tid))
        if t is None:
            raise NotFound("TripOrder", tid)

        if not t.is_confirmed:
            t.confirm_reconciliation(user_id=user_id)
            for wo_id in t.matched_work_order_ids:
                wo = await self.wo_repo.get_by_id(wo_id)  # type: ignore[arg-type]
                if wo is None or wo.status not in (
                    WorkOrderStatus.PENDING, WorkOrderStatus.MATCHED,
                ):
                    continue
                # Matched WOs are locked at reconcile time; transition
                # them to COMPLETED while preserving the lock.
                was_locked = wo.is_locked
                locked_at = wo.locked_at
                locked_by = wo.locked_by
                if was_locked:
                    wo.unlock()
                wo.complete()
                if was_locked:
                    wo.is_locked = True
                    wo.locked_at = locked_at
                    wo.locked_by = locked_by
                await self.wo_repo.save(wo)
        else:
            t.is_confirmed = False
            t.confirmed_by = None
            t.confirmed_at = None
            t.updated_at = _utcnow()

        await self.repo.save(t)
        await self.session.commit()
        return t


class DeleteTripOrder:
    def __init__(
        self,
        repo: TripOrderRepository,
        session: AsyncSession,
    ) -> None:
        self.repo = repo
        self.session = session

    async def __call__(self, tid: int) -> None:
        t = await self.repo.get_by_id(TripOrderId(tid))
        if t is None:
            raise NotFound("TripOrder", tid)
        if t.is_locked:
            raise TripOrderLocked(int(t.id) if t.id is not None else 0)
        await self.repo.delete(TripOrderId(tid))
        await self.session.commit()


# ── Bulk import + apply pricing ──────────────────────────────────


class CreateTripOrderFromImport:
    """Create TripOrders from the customer-Excel import pipeline.

    Groups rows by (trip_date + dropoff + tractor/customer-ref) so a
    truck running multiple containers becomes one TripOrder with N
    TripContainer rows. Pricing is intentionally NOT applied here — the
    accountant prices the trip later via Apply Pricing or manually, so
    every imported trip starts in DRAFT.

    Idempotent on `(client_id, trip_date, container_number)`. Returns
    counts plus the new trip ids so the UI can chain the apply-pricing
    flow.
    """

    def __init__(
        self,
        repo: TripOrderRepository,
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
            TripOrder as TripOrderORM,
            TripOrderContainer as TripOrderContainerORM,
        )

        client = await fetch_client(self.session, data.client_id)
        if client is None:
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
                "tractor_plate": r.tractor_plate,
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
                route_str = (
                    (f"{pickup} - {dropoff}").strip(" -")
                    if pickup or dropoff else ""
                )

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
                        f"Nhóm {idx}: pickup/dropoff không thể giải quyết "
                        f"(pickup={pickup!r}, dropoff={dropoff!r})"
                    )
                    continue

                trip = TripOrderORM(
                    trip_date=trip_date,
                    client_id=client.id,
                    route=route_str,
                    pickup_raw=pickup or None,
                    dropoff_raw=dropoff or None,
                    pickup_location_id=pickup_loc.id,
                    dropoff_location_id=dropoff_loc.id,
                    pricing_id=None,
                    unit_price=0,
                    driver_salary=0,
                    allowance=0,
                    revenue=0,
                    status=TripOrderStatus.DRAFT.value,
                    location_review_needed=review_needed,
                )
                if review_needed:
                    locations_review_flagged += 1
                self.session.add(trip)
                await self.session.flush()
                created_trip_ids.append(trip.id)

                for v in new_rows:
                    self.session.add(TripOrderContainerORM(
                        trip_order_id=trip.id,
                        container_number=v.get("container_no") or "",
                        work_type=v.get("work_type") or work_type,
                        container_size=v.get("container_size") or None,
                        container_type=v.get("container_type") or None,
                        freight_kind=v.get("freight_kind") or None,
                        gross_weight_kg=_to_float(v.get("gross_weight_kg")),
                        seal_no=v.get("seal_no") or None,
                        commodity=v.get("commodity") or None,
                        container_metadata=_extract_metadata(v),
                    ))
                    containers_created += 1

                created += 1
                if len(new_rows) > 1:
                    grouped_trips += 1
            except Exception as exc:
                errors.append(f"Nhóm {idx}: {exc}")

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
    """Bulk-apply tiered pricing to a set of TripOrders.

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
            list_drafts_for_pricing,
        )

        rows = await list_drafts_for_pricing(
            self.session,
            client_id=client_id,
            trip_ids=trip_ids,
            draft_status=TripOrderStatus.DRAFT.value,
        )

        priced = 0
        unpriced_ids: list[int] = []
        for trip in rows:
            if skip_already_priced and trip.unit_price and trip.unit_price > 0:
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
            trip.unit_price = tiered.unit_price
            trip.driver_salary = tiered.driver_salary
            trip.allowance = tiered.allowance
            trip.revenue = tiered.unit_price
            trip.pricing_id = tiered.pricing.id
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
    "tractor_plate", "driver_name", "customer_ref",
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
        tractor_plate=d.get("tractor_plate") or "",
        remarks=d.get("remarks") or "",
    )
