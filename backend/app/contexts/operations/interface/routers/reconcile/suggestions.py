"""Reconciliation router — sub-module: suggestion endpoints."""

from __future__ import annotations

import logging

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
)

from app.contexts.operations.application import (
    GetBookedTrip,
    GetDeliveredTrip,
)
from app.contexts.operations.interface.dependencies import (
    get_get_booked_trip,
    get_get_delivered_trip,
)
from app.contexts.operations.infrastructure.match_suggester import (
    suggest_trip_matches,
    suggest_wo_matches,
)
from app.core.deps import require_permission
from app.models.base import User
from app.models.domain import BookedTrip as BookedTripORM, DeliveredTrip as DeliveredTripORM
from app.schemas.domain import (
    SuggestMatchesResponse,
    SuggestWosResponse,
)

_logger = logging.getLogger(__name__)
router = APIRouter()

@router.get(
    "/suggest-matches/{delivered_trip_id:int}",
    response_model=SuggestMatchesResponse,
)
async def suggest_matches(
    delivered_trip_id: int,
    current_user: User = Depends(require_permission("reconcile", "Reconciliation")),
    use_case: GetDeliveredTrip = Depends(get_get_delivered_trip),
):
    db = use_case.repo.session  # type: ignore[attr-defined]
    from sqlalchemy import select
    wo = (await db.execute(
        select(DeliveredTripORM).where(DeliveredTripORM.id == delivered_trip_id)
    )).scalar_one_or_none()
    if wo is None:
        raise HTTPException(status_code=404, detail="DeliveredTrip not found")
    suggestions = await suggest_trip_matches(db, wo)
    return SuggestMatchesResponse(
        delivered_trip_id=delivered_trip_id, suggestions=suggestions,
    )


@router.get("/suggest-wos/{booked_trip_id}", response_model=SuggestWosResponse)
async def suggest_wos(
    booked_trip_id: int,
    current_user: User = Depends(require_permission("reconcile", "Reconciliation")),
    use_case: GetBookedTrip = Depends(get_get_booked_trip),
):
    db = use_case.repo.session  # type: ignore[attr-defined]
    from sqlalchemy import select
    to = (await db.execute(
        select(BookedTripORM).where(BookedTripORM.id == booked_trip_id)
    )).scalar_one_or_none()
    if to is None:
        raise HTTPException(status_code=404, detail="BookedTrip not found")
    suggestions = await suggest_wo_matches(db, to)
    return SuggestWosResponse(
        booked_trip_id=booked_trip_id, suggestions=suggestions,
    )


@router.get("/reconcile/links/{delivered_trip_id}")
async def get_linked_booked_trips(
    delivered_trip_id: int,
    current_user: User = Depends(require_permission("reconcile", "Reconciliation")),
    use_case: GetDeliveredTrip = Depends(get_get_delivered_trip),
    to_use_case: GetBookedTrip = Depends(get_get_booked_trip),
):
    """Return all BookedTrips linked to a DeliveredTrip via active reconciliations."""
    from app.contexts.operations.infrastructure.link_queries import (
        find_all_links_for_wo,
    )
    from sqlalchemy import select as sa_select

    db = use_case.repo.session  # type: ignore[attr-defined]

    links = await find_all_links_for_wo(db, delivered_trip_id)
    to_ids = [link.booked_trip_id for link in links]
    if not to_ids:
        return {"delivered_trip_id": delivered_trip_id, "booked_trips": []}

    from app.contexts.operations.interface.routers.booked_trips import (
        _load_one as _load_trip_one,
    )
    to_session = to_use_case.repo.session  # type: ignore[attr-defined]
    result = []
    for to_id in to_ids:
        t = await to_use_case(to_id)
        out = await _load_trip_one(to_session, t)
        result.append(out)
    return {"delivered_trip_id": delivered_trip_id, "booked_trips": result}
