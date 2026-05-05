import math

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from redis.asyncio import Redis
from sqlalchemy import text

from app.models.base import User
from app.schemas.base import PaginatedResponse
from app.schemas.domain import LocationCreate, LocationUpdate, LocationOut
from app.core.deps import require_permission
from app.core.redis import get_redis
from app.core.cache import CacheManager
from app.config import settings
from app.repositories.location_repo import LocationRepository
from app.repositories.deps import get_location_repo

router = APIRouter()


@router.get("/locations", response_model=PaginatedResponse[LocationOut])
async def list_locations(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    current_user: User = Depends(require_permission("read", "Location")),
    repo: LocationRepository = Depends(get_location_repo),
    redis: Redis = Depends(get_redis),
):
    cache = CacheManager(redis)
    cache_key = f"list:{page}:{page_size}"
    cached = await cache.get_json("locations", cache_key)
    if cached is not None:
        return PaginatedResponse(**cached)

    data, total = await repo.paginate(
        page, page_size, active_only=True, order_by=repo.model.name.asc()
    )

    response = PaginatedResponse[LocationOut](
        items=[LocationOut.model_validate(loc) for loc in data],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(total / page_size) if total > 0 else 0,
    )
    serialized = response.model_dump(mode="json")
    await cache.set_json("locations", cache_key, serialized, ttl=settings.CACHE_LOCATIONS_TTL)
    return response


@router.get("/locations/all", response_model=list[LocationOut])
async def list_all_locations(
    current_user: User = Depends(require_permission("read", "Location")),
    repo: LocationRepository = Depends(get_location_repo),
):
    data = await repo.list_active(order_by=repo.model.name.asc(), limit=10000)
    return [LocationOut.model_validate(loc) for loc in data]


@router.post("/locations", response_model=LocationOut, status_code=201)
async def create_location(
    body: LocationCreate,
    current_user: User = Depends(require_permission("update", "Location")),
    repo: LocationRepository = Depends(get_location_repo),
    redis: Redis = Depends(get_redis),
):
    if await repo.find_by_name(body.name):
        raise HTTPException(status_code=409, detail="Location already exists")

    location = await repo.create(name=body.name)
    await repo.session.commit()
    await repo.session.refresh(location)
    await CacheManager(redis).invalidate_namespace("locations")
    return location


@router.put("/locations/{location_id}", response_model=LocationOut)
async def update_location(
    location_id: int,
    body: LocationUpdate,
    current_user: User = Depends(require_permission("update", "Location")),
    repo: LocationRepository = Depends(get_location_repo),
    redis: Redis = Depends(get_redis),
):
    location = await repo.get_by_id_or_404(location_id)
    await repo.update(location, **body.model_dump(exclude_unset=True))
    await repo.session.commit()
    await repo.session.refresh(location)
    await CacheManager(redis).invalidate_namespace("locations")
    return location


@router.delete("/locations/{location_id}", status_code=204)
async def delete_location(
    location_id: int,
    current_user: User = Depends(require_permission("update", "Location")),
    repo: LocationRepository = Depends(get_location_repo),
    redis: Redis = Depends(get_redis),
):
    location = await repo.get_by_id_or_404(location_id)

    # Guard: check for FK references
    tables_cols = [
        ("routes", "pickup_location_id"),
        ("routes", "dropoff_location_id"),
        ("work_orders", "pickup_location_id"),
        ("work_orders", "dropoff_location_id"),
        ("trip_orders", "pickup_location_id"),
        ("trip_orders", "dropoff_location_id"),
        ("pricings", "pickup_location_id"),
        ("pricings", "dropoff_location_id"),
    ]
    for table, col in tables_cols:
        r = await repo.session.execute(
            text(f"SELECT 1 FROM {table} WHERE {col} = :lid LIMIT 1"),
            {"lid": location_id},
        )
        if r.scalar():
            raise HTTPException(
                status_code=409,
                detail=f"Cannot delete: location is referenced in {table}.{col}",
            )

    await repo.soft_delete(location)
    await repo.session.commit()
    await CacheManager(redis).invalidate_namespace("locations")
    return Response()


# ---------------------------------------------------------------------------
# GPS-aware picker endpoints — nearby search + driver-pin
# ---------------------------------------------------------------------------

import math as _math
from datetime import datetime as _dt, timezone as _tz
from sqlalchemy import select as _select
from sqlalchemy.ext.asyncio import AsyncSession as _AsyncSession
from app.database import get_db as _get_db
from app.models.domain import (
    Location as _Location,
    LocationAlias as _LocationAlias,
    TripOrder as _TripOrder,
)
from app.schemas.domain import LocationNearbyOut, LocationPinRequest
from app.core.deps import get_current_user as _get_current_user
from app.services.location_resolver import normalize as _normalize


def _haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    R = 6371.0
    dlat = _math.radians(lat2 - lat1)
    dlng = _math.radians(lng2 - lng1)
    a = _math.sin(dlat / 2) ** 2 + _math.cos(_math.radians(lat1)) * _math.cos(_math.radians(lat2)) * _math.sin(dlng / 2) ** 2
    return 2 * R * _math.asin(_math.sqrt(a))


@router.get("/locations/nearby", response_model=list[LocationNearbyOut])
async def nearby_locations(
    lat: float | None = Query(None, description="Driver GPS latitude"),
    lng: float | None = Query(None, description="Driver GPS longitude"),
    q: str | None = Query(None, description="Optional substring filter on name/alias"),
    trip_id: int | None = Query(
        None,
        description="If set, the trip's pickup/dropoff are pinned to the top.",
    ),
    radius_km: float = Query(50.0, ge=0.1, le=2000.0),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(_get_current_user),
    db: _AsyncSession = Depends(_get_db),
):
    """Driver-facing dropdown source.

    Order of results:
      1. The currently-assigned trip's pickup + dropoff (if `trip_id` is
         given). Pinned regardless of distance / q filter so the driver
         always sees the expected endpoints.
      2. Coords-within-radius locations, Haversine-sorted ascending.
      3. NULL-coord locations, alphabetical (selectable but
         deprioritized).

    `q` substring-matches against name + aliases (normalized text).
    No PostGIS — `ix_locations_lat_lng` makes the bbox pre-filter
    cheap; Haversine then runs in Python over the small candidate set.
    """
    pinned_ids: list[int] = []
    if trip_id is not None:
        trip = (await db.execute(
            _select(_TripOrder).where(_TripOrder.id == trip_id)
        )).scalar_one_or_none()
        if trip is not None:
            if trip.pickup_location_id:
                pinned_ids.append(trip.pickup_location_id)
            if trip.dropoff_location_id and trip.dropoff_location_id not in pinned_ids:
                pinned_ids.append(trip.dropoff_location_id)

    base_q = _select(_Location).where(_Location.is_active.is_(True))

    if q:
        q_norm = _normalize(q)
        candidate_locs = list((await db.execute(_select(_Location))).scalars().all())
        candidate_aliases = list((await db.execute(_select(_LocationAlias))).scalars().all())
        ids: set[int] = set()
        for loc in candidate_locs:
            if q_norm in _normalize(loc.name):
                ids.add(loc.id)
        for al in candidate_aliases:
            if q_norm in al.alias_normalized:
                ids.add(al.location_id)
        if not ids and not pinned_ids:
            return []
        base_q = base_q.where(_Location.id.in_(ids | set(pinned_ids)))

    locations = list((await db.execute(base_q)).scalars().all())
    by_id: dict[int, _Location] = {loc.id: loc for loc in locations}

    pinned_locs: list[_Location] = []
    for pid in pinned_ids:
        if pid in by_id:
            pinned_locs.append(by_id[pid])

    coord_rows: list[tuple[_Location, float]] = []
    no_coord_rows: list[_Location] = []
    excluded = {loc.id for loc in pinned_locs}
    for loc in locations:
        if loc.id in excluded:
            continue
        if loc.lat is not None and loc.lng is not None and lat is not None and lng is not None:
            d = _haversine_km(lat, lng, float(loc.lat), float(loc.lng))
            if d <= radius_km:
                coord_rows.append((loc, d))
        else:
            no_coord_rows.append(loc)
    coord_rows.sort(key=lambda x: x[1])
    no_coord_rows.sort(key=lambda x: x.name.lower())

    def _to_out(loc: _Location, d: float | None) -> LocationNearbyOut:
        return LocationNearbyOut(
            id=loc.id,
            name=loc.name,
            lat=float(loc.lat) if loc.lat is not None else None,
            lng=float(loc.lng) if loc.lng is not None else None,
            distance_km=round(d, 3) if d is not None else None,
        )

    out: list[LocationNearbyOut] = []
    for loc in pinned_locs:
        d = None
        if loc.lat is not None and loc.lng is not None and lat is not None and lng is not None:
            d = _haversine_km(lat, lng, float(loc.lat), float(loc.lng))
        out.append(_to_out(loc, d))
    for loc, d in coord_rows:
        out.append(_to_out(loc, d))
    for loc in no_coord_rows:
        out.append(_to_out(loc, None))
    return out[:limit]


@router.post("/locations/pin", response_model=LocationOut)
async def pin_driver_location(
    body: LocationPinRequest,
    current_user: User = Depends(_get_current_user),
    db: _AsyncSession = Depends(_get_db),
):
    """Driver pins their current location as a new place. Creates a
    `Location` with the driver's GPS coords, marks `geocode_source =
    "driver_pin"` and `pending_geocode = false` (we have coords; an
    admin will rename it from "Pinned at (lat, lng)" later).
    """
    name = body.name.strip()[:255]
    if not name:
        # Fallback name if driver didn't provide one
        name = f"Pinned at ({body.lat:.4f}, {body.lng:.4f})"
    # Idempotent on (name) — the unique constraint catches dupes
    existing = (await db.execute(
        _select(_Location).where(_Location.name == name)
    )).scalar_one_or_none()
    if existing is not None:
        # Update coords if not yet set
        if existing.lat is None or existing.lng is None:
            existing.lat = body.lat
            existing.lng = body.lng
            existing.geocoded_at = _dt.now(_tz.utc)
            existing.geocode_source = "driver_pin"
            existing.pending_geocode = False
            await db.commit()
            await db.refresh(existing)
        return LocationOut.model_validate(existing)

    loc = _Location(
        name=name,
        is_active=True,
        lat=body.lat,
        lng=body.lng,
        geocoded_at=_dt.now(_tz.utc),
        geocode_source="driver_pin",
        pending_geocode=False,
        created_via="driver_pin",
        created_by_id=current_user.id,
        location_review_needed=True,  # admin should rename if needed
    )
    db.add(loc)
    await db.commit()
    await db.refresh(loc)
    return LocationOut.model_validate(loc)
