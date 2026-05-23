"""Location HTTP endpoints — CRUD + GPS-aware nearby + driver-pin."""

from __future__ import annotations

import math

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from redis.asyncio import Redis
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.contexts.customer_pricing.application import (
    CreateLocation,
    DeleteLocation,
    ListAllActiveLocations,
    ListLocations,
    PinDriverLocation,
    UpdateLocation,
)
from app.contexts.customer_pricing.application.dto import (
    LocationCreateInput,
    LocationPinInput,
    LocationUpdateInput,
)
from app.contexts.customer_pricing.infrastructure.location_resolver import (
    normalize as _normalize,
)
from app.contexts.customer_pricing.domain.exceptions import (
    AlreadyExists,
    LocationInUse,
    NotFound,
)
from app.contexts.customer_pricing.domain.value_objects import LocationId
from app.contexts.customer_pricing.infrastructure.orm import (
    LocationAliasORM,
    LocationORM,
)
from app.contexts.customer_pricing.interface.dependencies import (
    get_create_location,
    get_delete_location,
    get_list_all_active_locations,
    get_list_locations,
    get_pin_driver_location,
    get_update_location,
)
from app.contexts.customer_pricing.interface.error_translation import translate
from app.contexts.customer_pricing.interface.schemas import (
    LocationCreate,
    LocationNearbyOut,
    LocationOut,
    LocationPinRequest,
    LocationUpdate,
    location_to_out,
)
from app.core.cache import CacheManager
from app.core.deps import get_current_user, require_permission
from app.core.redis import get_redis
from app.database import get_db
from app.models.base import User
from app.models.domain import BookedTrip
from app.schemas.base import PaginatedResponse


router = APIRouter()


# ── CRUD ────────────────────────────────────────────────────────


@router.get("/locations", response_model=PaginatedResponse[LocationOut])
async def list_locations(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=1000),
    current_user: User = Depends(require_permission("read", "Location")),
    use_case: ListLocations = Depends(get_list_locations),
    redis: Redis = Depends(get_redis),
):
    cache = CacheManager(redis)
    cache_key = f"list:{page}:{page_size}"
    cached = await cache.get_json("locations", cache_key)
    if cached is not None:
        return PaginatedResponse(**cached)

    items, total = await use_case(page=page, page_size=page_size, active_only=True)
    response = PaginatedResponse[LocationOut](
        items=[location_to_out(loc) for loc in items],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(total / page_size) if total > 0 else 0,
    )
    serialized = response.model_dump(mode="json")
    await cache.set_json(
        "locations", cache_key, serialized, ttl=settings.CACHE_LOCATIONS_TTL
    )
    return response


@router.get("/locations/all", response_model=list[LocationOut])
async def list_all_locations(
    current_user: User = Depends(require_permission("read", "Location")),
    use_case: ListAllActiveLocations = Depends(get_list_all_active_locations),
):
    items = await use_case(limit=10000)
    return [location_to_out(loc) for loc in items]


@router.post("/locations", response_model=LocationOut, status_code=201)
async def create_location(
    body: LocationCreate,
    current_user: User = Depends(require_permission("create", "Location")),
    use_case: CreateLocation = Depends(get_create_location),
    redis: Redis = Depends(get_redis),
):
    try:
        loc = await use_case(LocationCreateInput(name=body.name))
    except AlreadyExists as e:
        raise translate(e)
    await CacheManager(redis).invalidate_namespace("locations")
    return location_to_out(loc)


@router.put("/locations/{location_id}", response_model=LocationOut)
async def update_location(
    location_id: int,
    body: LocationUpdate,
    current_user: User = Depends(require_permission("update", "Location")),
    use_case: UpdateLocation = Depends(get_update_location),
    redis: Redis = Depends(get_redis),
):
    try:
        loc = await use_case(LocationId(location_id), LocationUpdateInput(name=body.name))
    except NotFound as e:
        raise translate(e)
    await CacheManager(redis).invalidate_namespace("locations")
    return location_to_out(loc)


@router.delete("/locations/{location_id}", status_code=204)
async def delete_location(
    location_id: int,
    current_user: User = Depends(require_permission("update", "Location")),
    use_case: DeleteLocation = Depends(get_delete_location),
    redis: Redis = Depends(get_redis),
):
    try:
        await use_case(LocationId(location_id))
    except NotFound as e:
        raise translate(e)
    except LocationInUse as e:
        raise HTTPException(
            status_code=409,
            detail=f"Cannot delete: location is referenced in {e.table}.{e.column}",
        )
    await CacheManager(redis).invalidate_namespace("locations")
    return Response()


# ── GPS-aware picker ────────────────────────────────────────────


def _haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2))
        * math.sin(dlng / 2) ** 2
    )
    return 2 * R * math.asin(math.sqrt(a))


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
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
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
            select(BookedTrip).where(BookedTrip.id == trip_id)
        )).scalar_one_or_none()
        if trip is not None:
            if trip.pickup_location_id:
                pinned_ids.append(trip.pickup_location_id)
            if trip.dropoff_location_id and trip.dropoff_location_id not in pinned_ids:
                pinned_ids.append(trip.dropoff_location_id)

    base_q = select(LocationORM).where(LocationORM.is_active.is_(True))

    if q:
        q_norm = _normalize(q)
        candidate_locs = list((await db.execute(select(LocationORM))).scalars().all())
        candidate_aliases = list(
            (await db.execute(select(LocationAliasORM))).scalars().all()
        )
        ids: set[int] = set()
        for loc in candidate_locs:
            if q_norm in _normalize(loc.name):
                ids.add(loc.id)
        for al in candidate_aliases:
            if q_norm in al.alias_normalized:
                ids.add(al.location_id)
        if not ids and not pinned_ids:
            return []
        base_q = base_q.where(LocationORM.id.in_(ids | set(pinned_ids)))

    locations = list((await db.execute(base_q)).scalars().all())
    by_id: dict[int, LocationORM] = {loc.id: loc for loc in locations}

    pinned_locs: list[LocationORM] = []
    for pid in pinned_ids:
        if pid in by_id:
            pinned_locs.append(by_id[pid])

    coord_rows: list[tuple[LocationORM, float]] = []
    no_coord_rows: list[LocationORM] = []
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

    def _to_out(loc: LocationORM, d: float | None) -> LocationNearbyOut:
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
    current_user: User = Depends(get_current_user),
    use_case: PinDriverLocation = Depends(get_pin_driver_location),
):
    """Driver pins their current location as a new place. Creates a
    `Location` with the driver's GPS coords, marks `geocode_source =
    "driver_pin"` and `pending_geocode = false`. Idempotent on `name`.
    """
    loc = await use_case(LocationPinInput(
        name=body.name,
        lat=body.lat,
        lng=body.lng,
        user_id=current_user.id,
    ))
    return location_to_out(loc)
