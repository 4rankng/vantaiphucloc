"""Driver route suggestions — frequency × recency scoring with GPS proximity bonus.

Returns personalised route suggestions for the logged-in driver.
If the driver has no history, falls back to global top routes (most popular
across all drivers) with a ``source=popular`` badge.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.database import async_session
from app.models.base import User
from app.models.domain import DeliveredTrip as DeliveredTripORM

router = APIRouter(prefix="/drivers", tags=["drivers"])


# ---------------------------------------------------------------------------
# Response schema
# ---------------------------------------------------------------------------

@dataclass
class _RouteRow:
    """Internal representation of a suggested route."""
    client_id: int
    partner_code: str | None
    partner_name: str
    pickup_location_id: int
    pickup_location_name: str
    dropoff_location_id: int
    dropoff_location_name: str
    frequency: int
    last_used: datetime
    score: float
    source: str  # "frequent" | "recent" | "popular"


class SuggestedRouteItem:
    """Pydantic-like flat dict for JSON serialisation."""

    @staticmethod
    def from_row(r: _RouteRow) -> dict:
        return {
            "partner": {
                "id": r.client_id,
                "code": r.partner_code,
                "name": r.partner_name,
            },
            "pickupLocation": {
                "id": r.pickup_location_id,
                "name": r.pickup_location_name,
            },
            "dropoffLocation": {
                "id": r.dropoff_location_id,
                "name": r.dropoff_location_name,
            },
            "frequency": r.frequency,
            "lastUsed": r.last_used.isoformat(),
            "score": round(r.score, 2),
            "source": r.source,
        }


# ---------------------------------------------------------------------------
# Scoring helpers
# ---------------------------------------------------------------------------

def _recency_weight(last_used: datetime) -> float:
    """Exponential decay: full weight for today, halves every ~14 days."""
    age_hours = (datetime.now(timezone.utc) - last_used).total_seconds() / 3600
    return math.exp(-age_hours / (14 * 24))


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


# ---------------------------------------------------------------------------
# Core query
# ---------------------------------------------------------------------------

_DRIVER_ROUTES_SQL = text("""
    SELECT
        p.id   AS client_id,
        p.code AS partner_code,
        p.name AS partner_name,
        pl.id  AS pickup_location_id,
        pl.name AS pickup_location_name,
        pl.lat AS pickup_lat,
        pl.lng AS pickup_lng,
        dl.id  AS dropoff_location_id,
        dl.name AS dropoff_location_name,
        COUNT(*) AS frequency,
        MAX(wo.created_at) AS last_used
    FROM delivered_trips wo
    JOIN partners p ON p.id = wo.client_id
    JOIN locations pl ON pl.id = wo.pickup_location_id
    JOIN locations dl ON dl.id = wo.dropoff_location_id
    WHERE wo.driver_id = :driver_id
      AND wo.status NOT IN ('CANCELLED')
    GROUP BY p.id, pl.id, dl.id
    ORDER BY frequency DESC, last_used DESC
    LIMIT :limit
""")

_GLOBAL_POPULAR_SQL = text("""
    SELECT
        p.id   AS client_id,
        p.code AS partner_code,
        p.name AS partner_name,
        pl.id  AS pickup_location_id,
        pl.name AS pickup_location_name,
        pl.lat AS pickup_lat,
        pl.lng AS pickup_lng,
        dl.id  AS dropoff_location_id,
        dl.name AS dropoff_location_name,
        COUNT(*) AS frequency,
        MAX(wo.created_at) AS last_used
    FROM delivered_trips wo
    JOIN partners p ON p.id = wo.client_id
    JOIN locations pl ON pl.id = wo.pickup_location_id
    JOIN locations dl ON dl.id = wo.dropoff_location_id
    WHERE wo.status NOT IN ('CANCELLED')
    GROUP BY p.id, pl.id, dl.id
    ORDER BY frequency DESC, last_used DESC
    LIMIT :limit
""")


async def _compute_suggestions(
    session: AsyncSession,
    driver_id: int,
    lat: float | None,
    lng: float | None,
    limit: int,
) -> list[dict]:
    """Return up to *limit* suggested routes for *driver_id*."""

    # 1. Driver's own history
    rows = (await session.execute(
        _DRIVER_ROUTES_SQL, {"driver_id": driver_id, "limit": limit * 3}
    )).fetchall()

    results: list[_RouteRow] = []
    for r in rows:
        freq = r.frequency
        recency = _recency_weight(r.last_used)
        score = freq * 0.6 + recency * 100 * 0.4  # normalise recency to ~same scale

        # GPS proximity bonus: if driver is close to the pickup location
        if lat is not None and lng is not None and r.pickup_lat and r.pickup_lng:
            dist = _haversine_km(lat, lng, r.pickup_lat, r.pickup_lng)
            # +30% bonus for <1 km, +15% for <5 km, tapering off
            if dist < 1:
                score *= 1.3
            elif dist < 5:
                score *= 1.15
            elif dist < 15:
                score *= 1.05

        source = "frequent" if freq >= 3 else "recent"
        results.append(_RouteRow(
            client_id=r.client_id,
            partner_code=r.partner_code,
            partner_name=r.partner_name,
            pickup_location_id=r.pickup_location_id,
            pickup_location_name=r.pickup_location_name,
            dropoff_location_id=r.dropoff_location_id,
            dropoff_location_name=r.dropoff_location_name,
            frequency=freq,
            last_used=r.last_used,
            score=score,
            source=source,
        ))

    # Sort by score descending
    results.sort(key=lambda x: x.score, reverse=True)
    driver_results = results[:limit]

    if len(driver_results) >= limit:
        return [SuggestedRouteItem.from_row(r) for r in driver_results]

    # 2. Fallback: fill remaining slots with global popular routes
    existing_keys = {
        (r.client_id, r.pickup_location_id, r.dropoff_location_id)
        for r in driver_results
    }
    global_rows = (await session.execute(
        _GLOBAL_POPULAR_SQL, {"limit": limit * 2}
    )).fetchall()

    for r in global_rows:
        key = (r.client_id, r.pickup_location_id, r.dropoff_location_id)
        if key in existing_keys:
            continue
        freq = r.frequency
        recency = _recency_weight(r.last_used)
        score = freq * 0.6 + recency * 100 * 0.4

        if lat is not None and lng is not None and r.pickup_lat and r.pickup_lng:
            dist = _haversine_km(lat, lng, r.pickup_lat, r.pickup_lng)
            if dist < 1:
                score *= 1.3
            elif dist < 5:
                score *= 1.15
            elif dist < 15:
                score *= 1.05

        driver_results.append(_RouteRow(
            client_id=r.client_id,
            partner_code=r.partner_code,
            partner_name=r.partner_name,
            pickup_location_id=r.pickup_location_id,
            pickup_location_name=r.pickup_location_name,
            dropoff_location_id=r.dropoff_location_id,
            dropoff_location_name=r.dropoff_location_name,
            frequency=freq,
            last_used=r.last_used,
            score=score,
            source="popular",
        ))
        if len(driver_results) >= limit:
            break

    return [SuggestedRouteItem.from_row(r) for r in driver_results]


# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------

@router.get("/me/suggested-routes")
async def suggested_routes(
    lat: float | None = Query(None, description="Driver GPS latitude"),
    lng: float | None = Query(None, description="Driver GPS longitude"),
    limit: int = Query(5, ge=1, le=10),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "driver":
        return {"items": []}

    async with async_session() as session:
        items = await _compute_suggestions(
            session,
            driver_id=current_user.id,
            lat=lat,
            lng=lng,
            limit=limit,
        )
    return {"items": items}
