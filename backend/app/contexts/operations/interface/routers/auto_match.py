"""Auto-match HTTP endpoints for reconciliation."""

from __future__ import annotations

import logging
from datetime import date

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import require_permission
from app.database import get_db
from app.models.base import User
from app.models.domain import Client, Location
from app.contexts.operations.infrastructure.auto_match_service import (
    auto_match_preview,
    backfill_vendor_driver_salary,
    confirm_matches,
    sync_matched_trips_pricing,
)
from app.contexts.operations.infrastructure.ai_reconciliation_service import (
    get_ai_match_suggestion,
)

_logger = logging.getLogger(__name__)

router = APIRouter()


class AutoMatchRequest(BaseModel):
    date_from: str | None = None
    date_to: str | None = None


class TripSummary(BaseModel):
    trip_date: str | None = None
    cont_number: str | None = None
    client_name: str | None = None
    pickup_name: str | None = None
    dropoff_name: str | None = None
    work_type: str | None = None
    vessel: str | None = None
    vehicle_plate: str | None = None


class MatchCandidateOut(BaseModel):
    delivered_trip_id: int
    booked_trip_id: int
    score: float
    confidence: str
    matched_fields: list[str]
    delivered: TripSummary
    booked: TripSummary


class AutoMatchResponse(BaseModel):
    candidates: list[MatchCandidateOut]
    unmatched_count: int
    scanned_count: int


class MatchPair(BaseModel):
    delivered_trip_id: int
    booked_trip_id: int
    sync_source: str | None = None
    field_choices: dict[str, str] | None = None
    # Optional score from the preview. When multiple pairs share the same
    # booked_trip_id, the one with the highest score wins; the rest are
    # skipped to prevent double-matching a single booked trip.
    score: float | None = None


class ConfirmMatchRequest(BaseModel):
    pairs: list[MatchPair]


class ConfirmMatchResponse(BaseModel):
    matched_count: int
    errors: list[str]


class UnmatchRequest(BaseModel):
    delivered_trip_id: int
    reason: str | None = None


class UnmatchResponse(BaseModel):
    ok: bool
    booked_trip_id: int | None = None
    cleared_revenue: int = 0
    cleared_driver_salary: int = 0


class BookedTripSummary(BaseModel):
    cont_number: str | None = None
    trip_date: str | None = None
    client_name: str | None = None
    pickup_name: str | None = None
    dropoff_name: str | None = None
    vessel: str | None = None
    work_type: str | None = None
    vehicle_plate: str | None = None


class AISuggestionResponse(BaseModel):
    suggested_booked_trip_id: int | None = None
    booked_trip_summary: BookedTripSummary | None = None
    reasoning: str
    confidence: str
    error: str | None = None


@router.post("/auto-match/preview", response_model=AutoMatchResponse)
async def auto_match_preview_endpoint(
    body: AutoMatchRequest,
    current_user: User = Depends(require_permission("reconcile", "Reconciliation")),
    db: AsyncSession = Depends(get_db),
):
    df = date.fromisoformat(body.date_from) if body.date_from else None
    dt = date.fromisoformat(body.date_to) if body.date_to else None

    result = await auto_match_preview(db, date_from=df, date_to=dt)

    # Resolve IDs → names for display
    client_ids: set[int] = set()
    location_ids: set[int] = set()
    for c in result["candidates"]:
        for side in ("delivered", "booked"):
            client_ids.add(c[side]["client_id"])
            location_ids.add(c[side]["pickup_location_id"])
            location_ids.add(c[side]["dropoff_location_id"])

    from sqlalchemy import select
    clients = dict((await db.execute(
        select(Client.id, Client.name).where(Client.id.in_(client_ids))
    )).all()) if client_ids else {}
    locations = dict((await db.execute(
        select(Location.id, Location.name).where(Location.id.in_(location_ids))
    )).all()) if location_ids else {}

    candidates_out = []
    for c in result["candidates"]:
        d = c["delivered"]
        b = c["booked"]
        candidates_out.append(MatchCandidateOut(
            delivered_trip_id=c["delivered_trip_id"],
            booked_trip_id=c["booked_trip_id"],
            score=c["score"],
            confidence=c["confidence"],
            matched_fields=c["matched_fields"],
            delivered=TripSummary(
                trip_date=d["trip_date"],
                cont_number=d["cont_number"],
                client_name=clients.get(d["client_id"]),
                pickup_name=locations.get(d["pickup_location_id"]),
                dropoff_name=locations.get(d["dropoff_location_id"]),
                work_type=d["work_type"],
                vessel=d["vessel"],
                vehicle_plate=d["vehicle_plate"],
            ),
            booked=TripSummary(
                trip_date=b["trip_date"],
                cont_number=b["cont_number"],
                client_name=clients.get(b["client_id"]),
                pickup_name=locations.get(b["pickup_location_id"]),
                dropoff_name=locations.get(b["dropoff_location_id"]),
                work_type=b["work_type"],
                vessel=b["vessel"],
                vehicle_plate=b["vehicle_plate"],
            ),
        ))

    return AutoMatchResponse(
        candidates=candidates_out,
        unmatched_count=result["unmatched_count"],
        scanned_count=result["scanned_count"],
    )


@router.post("/auto-match/confirm", response_model=ConfirmMatchResponse)
async def auto_match_confirm_endpoint(
    body: ConfirmMatchRequest,
    current_user: User = Depends(require_permission("reconcile", "Reconciliation")),
    db: AsyncSession = Depends(get_db),
):
    result = await confirm_matches(
        db,
        [
            (p.delivered_trip_id, p.booked_trip_id, p.sync_source, p.field_choices, p.score)
            for p in body.pairs
        ],
    )
    return ConfirmMatchResponse(**result)


@router.post("/auto-match/unmatch", response_model=UnmatchResponse)
async def unmatch_endpoint(
    body: UnmatchRequest,
    current_user: User = Depends(require_permission("reconcile", "Reconciliation")),
    db: AsyncSession = Depends(get_db),
):
    from fastapi import HTTPException
    from sqlalchemy import select
    from app.core.audit_context import set_audit_reason
    from app.models.domain import DeliveredTrip, BookedTrip

    wo = (await db.execute(
        select(DeliveredTrip).where(DeliveredTrip.id == body.delivered_trip_id)
    )).scalar_one_or_none()

    if not wo:
        raise HTTPException(404, "Delivered trip not found")
    if not wo.booked_trip_id:
        raise HTTPException(400, "Trip is not matched")

    # Snapshot the financial values BEFORE zeroing — the audit log captures
    # the old values via auto-capture, but we also need to return them to
    # the caller so the UI can confirm the unmatch effect.
    booked_id = wo.booked_trip_id
    cleared_revenue = int(wo.revenue or 0)
    cleared_driver_salary = int(wo.driver_salary or 0)

    # Zero out financials so the trip no longer contributes to billing/P&L.
    # The audit log (auto-captured via AuditableMixin) records the change.
    wo.booked_trip_id = None
    wo.revenue = 0
    wo.driver_salary = 0

    reason = (body.reason or "").strip() or "UNMATCH"
    set_audit_reason(reason)

    await db.flush()
    return UnmatchResponse(
        ok=True,
        booked_trip_id=booked_id,
        cleared_revenue=cleared_revenue,
        cleared_driver_salary=cleared_driver_salary,
    )


@router.post("/auto-match/ai-suggest/{delivered_trip_id}", response_model=AISuggestionResponse)
async def ai_suggest_endpoint(
    delivered_trip_id: int,
    current_user: User = Depends(require_permission("reconcile", "Reconciliation")),
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy import select
    from app.models.domain import BookedTrip

    result = await get_ai_match_suggestion(db, delivered_trip_id)
    if "error" in result:
        return AISuggestionResponse(
            reasoning="",
            confidence="none",
            error=result["error"],
        )

    suggested_id = result.get("suggested_booked_trip_id")
    booked_summary: BookedTripSummary | None = None

    if suggested_id:
        bt = (await db.execute(
            select(BookedTrip).where(BookedTrip.id == suggested_id)
        )).scalar_one_or_none()

        if bt:
            # Resolve location and client names
            client_name: str | None = None
            pickup_name: str | None = None
            dropoff_name: str | None = None

            loc_ids = {bt.pickup_location_id, bt.dropoff_location_id} - {None}
            client_ids = {bt.client_id} - {None}

            if loc_ids:
                locs = dict((await db.execute(
                    select(Location.id, Location.name).where(Location.id.in_(loc_ids))
                )).all())
                pickup_name = locs.get(bt.pickup_location_id)
                dropoff_name = locs.get(bt.dropoff_location_id)

            if client_ids:
                clients_res = dict((await db.execute(
                    select(Client.id, Client.name).where(Client.id.in_(client_ids))
                )).all())
                client_name = clients_res.get(bt.client_id)

            booked_summary = BookedTripSummary(
                cont_number=bt.cont_number,
                trip_date=str(bt.trip_date) if bt.trip_date else None,
                client_name=client_name,
                pickup_name=pickup_name,
                dropoff_name=dropoff_name,
                vessel=bt.vessel,
                work_type=bt.work_type,
                vehicle_plate=bt.vehicle_plate,
            )

    return AISuggestionResponse(
        suggested_booked_trip_id=suggested_id,
        booked_trip_summary=booked_summary,
        reasoning=result.get("reasoning", ""),
        confidence=result.get("confidence", "low"),
    )


class SyncPricingRequest(BaseModel):
    date_from: str
    date_to: str


class SyncPricingResponse(BaseModel):
    updated_count: int


@router.post("/auto-match/sync-pricing", response_model=SyncPricingResponse)
async def sync_pricing_endpoint(
    body: SyncPricingRequest,
    current_user: User = Depends(require_permission("reconcile", "Reconciliation")),
    db: AsyncSession = Depends(get_db),
):
    try:
        updated_count = await sync_matched_trips_pricing(
            db, date_from=body.date_from, date_to=body.date_to
        )
        return SyncPricingResponse(updated_count=updated_count)
    except Exception as exc:
        from fastapi import HTTPException
        _logger.exception("Failed to sync matched trips pricing")
        raise HTTPException(500, detail=str(exc))


class BackfillVendorSalaryRequest(BaseModel):
    date_from: str | None = None
    date_to: str | None = None


class BackfillVendorSalaryResponse(BaseModel):
    updated_count: int


@router.post(
    "/auto-match/backfill-vendor-salary",
    response_model=BackfillVendorSalaryResponse,
)
async def backfill_vendor_salary_endpoint(
    body: BackfillVendorSalaryRequest,
    current_user: User = Depends(require_permission("reconcile", "Reconciliation")),
    db: AsyncSession = Depends(get_db),
):
    """One-shot backfill for matched vendor trips with driver_salary = 0.

    Optional date range filters by trip_date. When omitted, runs over all
    matched vendor trips with driver_salary = 0.
    """
    updated = await backfill_vendor_driver_salary(
        db, date_from=body.date_from, date_to=body.date_to
    )
    return BackfillVendorSalaryResponse(updated_count=updated)
