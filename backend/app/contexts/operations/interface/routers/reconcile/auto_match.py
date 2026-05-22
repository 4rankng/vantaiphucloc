"""Reconciliation router — sub-module: auto-match endpoints."""

from __future__ import annotations

import logging

from fastapi import (
    APIRouter,
    Depends,
    Request,
)

from app.contexts.operations.application import (
    MatchTripToDeliveredTrip,
    GetDeliveredTrip,
)
from app.contexts.operations.application.dto import ReconcileInput
from app.contexts.operations.infrastructure.match_suggester import suggest_trip_matches
from app.contexts.operations.interface.dependencies import (
    get_get_delivered_trip,
    get_match_booked_to_delivered_trip,
)
from app.core.audit import log_action
from app.core.deps import require_permission
from app.models.base import User
from app.models.domain import BookedTrip as BookedTripORM, BookedTripContainer, DeliveredTrip as DeliveredTripORM
from app.schemas.domain import (
    AutoMatchCandidate,
    AutoMatchConfirmRequest,
    AutoMatchConfirmResponse,
    AutoMatchConfirmResult,
    AutoMatchRequest,
    AutoMatchResponse,
    AutoMatchResult,
    AutoMatchDeliveredTripRef,
    AutoMatchBookedTripRef,
    AutoMatchCriterion,
    AutoMatchStats,
    AutoMatchRejectionReason,
    UnmatchedDeliveredTripRef,
)

_logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/reconcile/auto-match", response_model=AutoMatchResponse)
async def auto_match(
    body: AutoMatchRequest,
    request: Request,
    current_user: User = Depends(require_permission("reconcile", "Reconciliation")),
    wo_use_case: GetDeliveredTrip = Depends(get_get_delivered_trip),
):
    """Auto-match preview: returns candidates WITHOUT committing.

    Full-score candidates (5/5) are marked suggested_default=True.
    Partial candidates (≥ 3/5) are also returned for review.
    Use /reconcile/auto-match/confirm to actually commit selected pairs.
    """
    from datetime import date as date_type
    from sqlalchemy import select as sa_select
    from app.models.domain import DeliveredTrip as WO, Reconciliation
    from app.schemas.domain import (
        AutoMatchCandidate,
        AutoMatchCriterion,
        AutoMatchDeliveredTripRef,
        AutoMatchBookedTripRef,
        UnmatchedDeliveredTripRef,
        AutoMatchStats,
        AutoMatchRejectionReason,
    )
    from app.core.summaries import (
        get_client_summary,
        get_driver_summary,
        get_location_summary,
        load_client_summaries,
        load_driver_summaries,
        load_location_summaries,
    )

    db = wo_use_case.repo.session  # type: ignore[attr-defined]

    date_from = date_type.fromisoformat(body.date_from) if body.date_from else None
    date_to = date_type.fromisoformat(body.date_to) if body.date_to else None

    # Fetch all PENDING work orders in date range (filter by trip_date,
    # fall back to created_at for records that pre-date that column).
    wo_query = sa_select(WO).where(WO.status == "PENDING")
    if date_from:
        from sqlalchemy import or_ as _or
        wo_query = wo_query.where(
            _or(WO.trip_date >= date_from,
                (WO.trip_date == None) & (WO.created_at >= date_from))  # noqa: E711
        )
    if date_to:
        from sqlalchemy import or_ as _or
        wo_query = wo_query.where(
            _or(WO.trip_date <= date_to,
                (WO.trip_date == None) & (WO.created_at <= date_to))  # noqa: E711
        )

    delivered_trips = list((await db.execute(wo_query)).scalars().all())

    matched_to_ids = set(
        r[0] for r in (await db.execute(
            sa_select(Reconciliation.booked_trip_id).where(
                Reconciliation.is_active == True  # noqa: E712
            )
        )).all()
    )

    candidates: list[AutoMatchCandidate] = []
    unmatched_refs: list[UnmatchedDeliveredTripRef] = []
    unmatched_wos: list[WO] = []
    skipped = 0
    errors: list[str] = []

    # Preload helpers for building refs
    for wo in delivered_trips:
        try:
            suggestions = await suggest_trip_matches(db, wo)
            # Filter out already-matched trip orders
            suggestions = [s for s in suggestions if s.booked_trip.id not in matched_to_ids]
            if not suggestions:
                # Check if WO has any active link already
                has_link = (await db.execute(
                    sa_select(Reconciliation.id).where(
                        Reconciliation.delivered_trip_id == wo.id,
                        Reconciliation.is_active == True,  # noqa: E712
                    )
                )).scalar_one_or_none()
                if has_link:
                    skipped += 1
                else:
                    unmatched_wos.append(wo)
                    unmatched_refs.append(UnmatchedDeliveredTripRef(
                        id=wo.id,
                        plate=None,  # populated below if needed
                        date=wo.created_at.date().isoformat() if wo.created_at else None,
                    ))
                continue

            # Build refs for this WO
            client_ids_set = {s.booked_trip.client.id for s in suggestions} | {wo.client_id}
            location_ids_set = set()
            for s in suggestions:
                location_ids_set |= {s.booked_trip.pickup_location.id, s.booked_trip.dropoff_location.id}
            location_ids_set |= {wo.pickup_location_id, wo.dropoff_location_id}

            partners_map = await load_client_summaries(db, client_ids_set)
            locations_map = await load_location_summaries(db, location_ids_set)
            drivers_map = await load_driver_summaries(db, {wo.driver_id})

            wo_partner = get_client_summary(partners_map, wo.client_id)
            wo_pickup = get_location_summary(locations_map, wo.pickup_location_id)
            wo_dropoff = get_location_summary(locations_map, wo.dropoff_location_id)
            wo_driver = get_driver_summary(drivers_map, wo.driver_id)
            wo_ref = AutoMatchDeliveredTripRef(
                id=wo.id,
                plate=wo_driver.vehicle.plate if wo_driver and wo_driver.vehicle else None,
                date=wo.created_at.date().isoformat() if wo.created_at else None,
                client_name=wo_partner.name,
            )

            for s in suggestions:
                if s.score < 0.5:
                    continue  # skip below-threshold
                to_partner = get_client_summary(partners_map, s.booked_trip.client.id)
                to_pickup = get_location_summary(locations_map, s.booked_trip.pickup_location.id)
                to_dropoff = get_location_summary(locations_map, s.booked_trip.dropoff_location.id)
                to_ref = AutoMatchBookedTripRef(
                    id=s.booked_trip.id,
                    client_name=to_partner.name,
                    containers=list(s.booked_trip.containers or []),
                )

                criteria = [
                    AutoMatchCriterion(key=c.name, label=c.label, match=c.match)
                    for c in s.criteria
                ]

                candidates.append(AutoMatchCandidate(
                    delivered_trip_id=wo.id,
                    booked_trip_id=s.booked_trip.id,
                    score=s.score,
                    match_score=s.match_score,
                    max_score=s.max_score,
                    matched_fields=s.matched_fields,
                    criteria=criteria,
                    suggested_default=s.score >= (4.0 / 5.0),
                    delivered_trip_ref=wo_ref,
                    booked_trip_ref=to_ref,
                ))

        except Exception as exc:
            errors.append(f"WO#{wo.id}: {exc}")

    # ── Compute rejection breakdown (trip-based: why trips don't match WOs) ──
    stats = AutoMatchStats()
    if unmatched_wos:
        from app.models.domain import BookedTrip as TORM, BookedTripContainer as TOC, DeliveredTripContainer as WOC
        from app.contexts.operations.infrastructure.match_suggester import (
            _load_alias_groups, _locations_match,
        )
        from app.utils.iso6346 import normalize_container_number

        all_tos = list((await db.execute(
            sa_select(TORM).where(TORM.status.in_(["PENDING", "MATCHED"]))
        )).scalars().all())

        if all_tos:
            alias_groups = await _load_alias_groups(db)

            wo_client_ids = {wo.client_id for wo in unmatched_wos}
            wo_dates = {wo.created_at.date() for wo in unmatched_wos if wo.created_at}

            wo_cont_rows = (await db.execute(
                sa_select(WOC.delivered_trip_id, WOC.container_number)
                .where(WOC.delivered_trip_id.in_([wo.id for wo in unmatched_wos]))
            )).all()
            wo_container_map: dict[int, set[str]] = {}
            for wid, cn in wo_cont_rows:
                if cn:
                    wo_container_map.setdefault(wid, set()).add(
                        normalize_container_number(cn)
                    )
            wo_pickup_ids = {wo.pickup_location_id for wo in unmatched_wos if wo.pickup_location_id}
            wo_dropoff_ids = {wo.dropoff_location_id for wo in unmatched_wos if wo.dropoff_location_id}

            to_cont_rows = (await db.execute(
                sa_select(TOC.booked_trip_id, TOC.container_number)
            )).all()
            to_container_map: dict[int, set[str]] = {}
            for tid, cn in to_cont_rows:
                if cn:
                    to_container_map.setdefault(tid, set()).add(
                        normalize_container_number(cn)
                    )

            location_mismatch = 0
            date_mismatch = 0
            client_mismatch = 0
            container_mismatch = 0

            for to in all_tos:
                has_client = to.client_id in wo_client_ids
                to_date = to.trip_date
                has_date = to_date in wo_dates if to_date else False
                has_pickup = any(
                    _locations_match(to.pickup_location_id, pid, alias_groups)
                    for pid in wo_pickup_ids
                ) if to.pickup_location_id else False
                has_dropoff = any(
                    _locations_match(to.dropoff_location_id, did, alias_groups)
                    for did in wo_dropoff_ids
                ) if to.dropoff_location_id else False
                has_location = has_pickup or has_dropoff

                to_cns = to_container_map.get(to.id, set())
                has_container = any(
                    to_cns & wo_container_map.get(wo.id, set())
                    for wo in unmatched_wos
                ) if to_cns else False

                if not has_location:
                    location_mismatch += 1
                if not has_date:
                    date_mismatch += 1
                if not has_client:
                    client_mismatch += 1
                if not has_container:
                    container_mismatch += 1

            reason_defs = [
                ("location_mismatch", "Chưa map địa điểm", location_mismatch),
                ("date_mismatch", "Ngày không khớp", date_mismatch),
                ("client_mismatch", "Khách hàng không khớp", client_mismatch),
                ("container_mismatch", "Container không khớp", container_mismatch),
            ]
            stats = AutoMatchStats(reasons=[
                AutoMatchRejectionReason(code=c, label=l, count=n)
                for c, l, n in reason_defs if n > 0
            ])

    return AutoMatchResponse(
        scanned_delivered_trip_count=len(delivered_trips),
        skipped_already_matched=skipped,
        candidates=candidates,
        unmatched_delivered_trip_refs=unmatched_refs,
        errors=errors,
        stats=stats,
    )


@router.post("/reconcile/auto-match/confirm", response_model=AutoMatchConfirmResponse)
async def auto_match_confirm(
    body: AutoMatchConfirmRequest,
    request: Request,
    current_user: User = Depends(require_permission("reconcile", "Reconciliation")),
    match_use_case: MatchTripToDeliveredTrip = Depends(get_match_booked_to_delivered_trip),
):
    """Confirm selected auto-match pairs — only commits user-reviewed pairs.

    Validates per pair: WO still PENDING, TO has remaining capacity,
    no existing active reconciliation for the pair.
    Idempotent: confirming the same pair twice returns error, no duplicate.
    """
    import time
    from sqlalchemy import select as sa_select
    from app.contexts.operations.infrastructure.link_queries import (
        count_links_for_to,
        find_link,
    )

    db = match_use_case.session
    start = time.monotonic()

    matched: list[AutoMatchConfirmResult] = []
    failed: list[AutoMatchConfirmResult] = []

    for pair in body.pairs:
        try:
            # Idempotency check
            existing = await find_link(db, pair.delivered_trip_id, pair.booked_trip_id)
            if existing:
                failed.append(AutoMatchConfirmResult(
                    delivered_trip_id=pair.delivered_trip_id,
                    booked_trip_id=pair.booked_trip_id,
                    success=False,
                    error="Đã ghép trước đó",
                ))
                continue

            # Validate WO is still PENDING
            wo = (await db.execute(
                sa_select(DeliveredTripORM).where(DeliveredTripORM.id == pair.delivered_trip_id)
            )).scalar_one_or_none()
            if wo is None:
                failed.append(AutoMatchConfirmResult(
                    delivered_trip_id=pair.delivered_trip_id,
                    booked_trip_id=pair.booked_trip_id,
                    success=False,
                    error="Phiếu chuyến không tồn tại",
                ))
                continue
            if wo.status != "PENDING":
                failed.append(AutoMatchConfirmResult(
                    delivered_trip_id=pair.delivered_trip_id,
                    booked_trip_id=pair.booked_trip_id,
                    success=False,
                    error=f"Phiếu chuyến đã ở trạng thái {wo.status}",
                ))
                continue

            # Validate TO capacity
            to_orm = (await db.execute(
                sa_select(BookedTripORM).where(BookedTripORM.id == pair.booked_trip_id)
            )).scalar_one_or_none()
            if to_orm is None:
                failed.append(AutoMatchConfirmResult(
                    delivered_trip_id=pair.delivered_trip_id,
                    booked_trip_id=pair.booked_trip_id,
                    success=False,
                    error="Đơn hàng không tồn tại",
                ))
                continue

            to_containers = (await db.execute(
                sa_select(BookedTripContainer).where(
                    BookedTripContainer.booked_trip_id == pair.booked_trip_id
                )
            )).scalars().all()
            container_count = len(to_containers)
            already_linked = await count_links_for_to(db, pair.booked_trip_id)
            if container_count == 0:
                failed.append(AutoMatchConfirmResult(
                    delivered_trip_id=pair.delivered_trip_id,
                    booked_trip_id=pair.booked_trip_id,
                    success=False,
                    error="Đơn hàng chưa có container",
                ))
                continue
            if already_linked >= container_count:
                failed.append(AutoMatchConfirmResult(
                    delivered_trip_id=pair.delivered_trip_id,
                    booked_trip_id=pair.booked_trip_id,
                    success=False,
                    error="Đơn hàng đã hết sức chứa",
                ))
                continue

            # Perform the match
            to = await match_use_case(ReconcileInput(
                delivered_trip_id=pair.delivered_trip_id,
                booked_trip_id=pair.booked_trip_id,
                user_id=current_user.id,
            ))
            await log_action(
                db, user_id=current_user.id, action="AUTO_MATCH_CONFIRM",
                table_name="matched_trips",
                record_id=int(to.id),  # type: ignore[arg-type]
                new_value={
                    "delivered_trip_id": pair.delivered_trip_id,
                    "booked_trip_id": pair.booked_trip_id,
                },
                request=request,
            )
            matched.append(AutoMatchConfirmResult(
                delivered_trip_id=pair.delivered_trip_id,
                booked_trip_id=pair.booked_trip_id,
                success=True,
            ))
        except Exception as exc:
            failed.append(AutoMatchConfirmResult(
                delivered_trip_id=pair.delivered_trip_id,
                booked_trip_id=pair.booked_trip_id,
                success=False,
                error=str(exc),
            ))

    # Single commit for all successful pairs
    if matched:
        try:
            await db.commit()
        except Exception:
            _logger.exception("Commit failed after auto-match confirm")
            raise

    duration_ms = int((time.monotonic() - start) * 1000)
    success_count = len(matched)
    fail_count = len(failed)
    _logger.info(
        "Auto-match confirm: %d/%d succeeded, %d failed, %dms",
        success_count, success_count + fail_count, fail_count, duration_ms,
    )

    return AutoMatchConfirmResponse(
        matched=matched,
        failed=failed,
        duration_ms=duration_ms,
    )
