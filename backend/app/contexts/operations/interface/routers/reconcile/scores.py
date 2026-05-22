"""Reconciliation router — sub-module: match score endpoint."""

from __future__ import annotations

import logging

from fastapi import (
    APIRouter,
    Depends,
    Query,
)

from app.contexts.operations.application import GetDeliveredTrip
from app.contexts.operations.interface.dependencies import get_get_delivered_trip
from app.contexts.operations.infrastructure.match_suggester import suggest_trip_matches
from app.core.deps import require_permission
from app.models.base import User
from app.schemas.domain import (
    DeliveredTripMatchScore,
    MatchScoresResponse,
)

_logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/match-scores", response_model=MatchScoresResponse)
async def match_scores(
    date_from: str | None = Query(None),
    date_to: str | None = Query(None),
    current_user: User = Depends(require_permission("reconcile", "Reconciliation")),
    use_case: GetDeliveredTrip = Depends(get_get_delivered_trip),
):
    """Return the best match score for each PENDING work order.

    Lightweight endpoint so the master list can show color-coded score
    chips without fetching full suggestions for every row.
    """
    from datetime import date as date_type
    from sqlalchemy import select as sa_select
    from app.models.domain import DeliveredTrip as WO, Reconciliation

    db = use_case.repo.session  # type: ignore[attr-defined]

    df = date_type.fromisoformat(date_from) if date_from else None
    dt = date_type.fromisoformat(date_to) if date_to else None

    wo_query = sa_select(WO).where(WO.status == "PENDING")
    from sqlalchemy import or_ as _or
    if df:
        wo_query = wo_query.where(
            _or(WO.trip_date >= df,
                (WO.trip_date == None) & (WO.created_at >= df))  # noqa: E711
        )
    if dt:
        wo_query = wo_query.where(
            _or(WO.trip_date <= dt,
                (WO.trip_date == None) & (WO.created_at <= dt))  # noqa: E711
        )

    delivered_trips = list((await db.execute(wo_query)).scalars().all())
    scores: list[DeliveredTripMatchScore] = []

    for wo in delivered_trips:
        suggestions = await suggest_trip_matches(db, wo)
        if suggestions:
            best = suggestions[0]
            scores.append(DeliveredTripMatchScore(
                delivered_trip_id=wo.id,
                best_score=best.score,
                best_match_score=best.match_score,
                max_score=best.max_score,
                suggestion_count=len(suggestions),
            ))
        else:
            scores.append(DeliveredTripMatchScore(
                delivered_trip_id=wo.id,
                best_score=0.0,
                best_match_score=0,
            ))

    return MatchScoresResponse(scores=scores)
