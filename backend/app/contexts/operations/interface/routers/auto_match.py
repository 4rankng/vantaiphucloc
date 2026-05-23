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
    confirm_matches,
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


class ConfirmMatchRequest(BaseModel):
    pairs: list[MatchPair]


class ConfirmMatchResponse(BaseModel):
    matched_count: int
    errors: list[str]


class UnmatchRequest(BaseModel):
    delivered_trip_id: int


class UnmatchResponse(BaseModel):
    ok: bool
    booked_trip_id: int | None = None


class AISuggestionResponse(BaseModel):
    suggested_booked_trip_id: int | None = None
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
    result = await confirm_matches(db, [(p.delivered_trip_id, p.booked_trip_id, p.sync_source) for p in body.pairs])
    return ConfirmMatchResponse(**result)


@router.post("/auto-match/unmatch", response_model=UnmatchResponse)
async def unmatch_endpoint(
    body: UnmatchRequest,
    current_user: User = Depends(require_permission("reconcile", "Reconciliation")),
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy import select
    from app.models.domain import DeliveredTrip, BookedTrip

    wo = (await db.execute(
        select(DeliveredTrip).where(DeliveredTrip.id == body.delivered_trip_id)
    )).scalar_one_or_none()

    if not wo:
        from fastapi import HTTPException
        raise HTTPException(404, "Delivered trip not found")
    if not wo.booked_trip_id:
        from fastapi import HTTPException
        raise HTTPException(400, "Trip is not matched")
    booked_id = wo.booked_trip_id
    wo.booked_trip_id = None

    if booked_id:
        to = (await db.execute(
            select(BookedTrip).where(BookedTrip.id == booked_id)
        )).scalar_one_or_none()
        if to:
            to.matched = False

    await db.flush()
    return UnmatchResponse(ok=True, booked_trip_id=booked_id)


@router.post("/auto-match/ai-suggest/{delivered_trip_id}", response_model=AISuggestionResponse)
async def ai_suggest_endpoint(
    delivered_trip_id: int,
    current_user: User = Depends(require_permission("reconcile", "Reconciliation")),
    db: AsyncSession = Depends(get_db),
):
    result = await get_ai_match_suggestion(db, delivered_trip_id)
    if "error" in result:
        return AISuggestionResponse(
            reasoning="",
            confidence="none",
            error=result["error"],
        )
    return AISuggestionResponse(
        suggested_booked_trip_id=result.get("suggested_booked_trip_id"),
        reasoning=result.get("reasoning", ""),
        confidence=result.get("confidence", "low"),
    )
