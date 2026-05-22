"""Reconciliation router — sub-module: bulk match endpoint."""

from __future__ import annotations

import logging

from fastapi import (
    APIRouter,
    Depends,
    Request,
)

from app.contexts.operations.application import MatchTripToDeliveredTrip
from app.contexts.operations.application.dto import ReconcileInput
from app.contexts.operations.infrastructure.match_suggester import suggest_trip_matches
from app.contexts.operations.interface.dependencies import get_match_booked_to_delivered_trip
from app.core.audit import log_action
from app.core.deps import require_permission
from app.models.base import User
from app.models.domain import DeliveredTrip as DeliveredTripORM
from app.schemas.domain import (
    BulkMatchRequest,
    BulkMatchResponse,
    BulkMatchResult,
)

_logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/reconcile/bulk-match", response_model=BulkMatchResponse)
async def bulk_match(
    body: BulkMatchRequest,
    request: Request,
    current_user: User = Depends(require_permission("reconcile", "Reconciliation")),
    match_use_case: MatchTripToDeliveredTrip = Depends(get_match_booked_to_delivered_trip),
):
    """Bulk-match pairs of work orders with trip orders.

    Only accepts pairs where the suggestion has score == 1.0 (5/5 full match).
    """
    db = match_use_case.session
    matched: list[BulkMatchResult] = []
    errors: list[str] = []

    for pair in body.pairs:
        try:
            # Verify full match score
            from sqlalchemy import select as sa_select
            wo = (await db.execute(
                sa_select(DeliveredTripORM).where(DeliveredTripORM.id == pair.delivered_trip_id)
            )).scalar_one_or_none()
            if wo is None:
                errors.append(f"DeliveredTrip #{pair.delivered_trip_id} not found")
                continue

            suggestions = await suggest_trip_matches(db, wo)
            matching = [s for s in suggestions if s.booked_trip.id == pair.booked_trip_id]
            if not matching:
                errors.append(
                    f"TO #{pair.booked_trip_id} not a suggestion for WO #{pair.delivered_trip_id}"
                )
                continue
            if matching[0].score < 1.0:
                errors.append(
                    f"WO #{pair.delivered_trip_id} → TO #{pair.booked_trip_id}: "
                    f"score {matching[0].match_score}/{matching[0].max_score}, "
                    f"only full matches (5/5) allowed"
                )
                continue

            to = await match_use_case(ReconcileInput(
                delivered_trip_id=pair.delivered_trip_id,
                booked_trip_id=pair.booked_trip_id,
                user_id=current_user.id,
            ))
            await log_action(
                db, user_id=current_user.id, action="BULK_MATCH",
                table_name="matched_trips",
                record_id=int(to.id),  # type: ignore[arg-type]
                new_value={
                    "delivered_trip_id": pair.delivered_trip_id,
                    "booked_trip_id": pair.booked_trip_id,
                },
                request=request,
            )
            await db.commit()

            # Salary is calculated on-the-fly; no post-match recalc needed.

            matched.append(BulkMatchResult(
                delivered_trip_id=pair.delivered_trip_id,
                booked_trip_id=pair.booked_trip_id,
                success=True,
            ))
        except Exception as exc:
            errors.append(f"WO #{pair.delivered_trip_id} → TO #{pair.booked_trip_id}: {exc}")

    return BulkMatchResponse(matched=matched, errors=errors)
