"""Location alias HTTP endpoints — CRUD + FSM confirmation + merge."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.contexts.customer_pricing.domain.exceptions import (
    InvalidAliasTransition,
    NotFound,
)
from app.contexts.customer_pricing.domain.value_objects import LocationAliasId, LocationId
from app.contexts.customer_pricing.infrastructure.location_resolver import normalize
from app.contexts.customer_pricing.infrastructure.mappers import (
    alias_to_domain,
    alias_to_orm,
    location_to_domain,
)
from app.contexts.customer_pricing.infrastructure.orm import (
    LocationAliasORM,
    LocationORM,
)
from app.core.deps import require_permission
from app.database import get_db
from app.models.base import User
from app.models.domain import (
    Pricing,
    TripOrder,
    WorkOrder,
)
from app.schemas.domain import (
    CreateAliasRequest,
    LocationAliasOut,
    MergeLocationsRequest,
    MergeLocationsResponse,
    RejectAliasRequest,
)

router = APIRouter()


# ── Helpers ────────────────────────────────────────────────────


def _alias_to_out(a) -> LocationAliasOut:
    return LocationAliasOut(
        id=int(a.id),
        location_id=int(a.location_id),
        alias=a.alias,
        alias_normalized=a.alias_normalized,
        source=a.source,
        status=a.status,
        confirmed_by_id=a.confirmed_by_id,
        confirmed_at=a.confirmed_at,
        rejected_by_id=a.rejected_by_id,
        rejected_at=a.rejected_at,
        merge_target_location_id=a.merge_target_location_id,
        note=a.note,
        created_at=a.created_at,
        created_by_id=a.created_by_id,
    )


async def _load_alias_or_404(alias_id: int, db: AsyncSession) -> LocationAliasORM:
    orm = await db.get(LocationAliasORM, alias_id)
    if orm is None:
        raise HTTPException(status_code=404, detail=f"LocationAlias {alias_id} not found")
    return orm


# ── CRUD ───────────────────────────────────────────────────────


@router.get("/location-aliases", response_model=list[LocationAliasOut])
async def list_aliases(
    status: str | None = Query(None),
    location_id: int | None = Query(None),
    current_user: User = Depends(require_permission("read", "Location")),
    db: AsyncSession = Depends(get_db),
):
    q = select(LocationAliasORM)
    if status:
        q = q.where(LocationAliasORM.status == status)
    if location_id:
        q = q.where(LocationAliasORM.location_id == location_id)
    q = q.order_by(LocationAliasORM.created_at.desc())
    rows = (await db.execute(q)).scalars().all()
    return [_alias_to_out(r) for r in rows]


@router.post("/location-aliases", response_model=LocationAliasOut, status_code=201)
async def create_alias(
    body: CreateAliasRequest,
    current_user: User = Depends(require_permission("update", "Location")),
    db: AsyncSession = Depends(get_db),
):
    loc = await db.get(LocationORM, body.location_id)
    if loc is None:
        raise HTTPException(status_code=404, detail=f"Location {body.location_id} not found")

    norm = normalize(body.alias)
    existing = (await db.execute(
        select(LocationAliasORM).where(LocationAliasORM.alias_normalized == norm)
    )).scalar_one_or_none()
    if existing is not None:
        return _alias_to_out(existing)

    orm = LocationAliasORM(
        location_id=body.location_id,
        alias=body.alias[:255],
        alias_normalized=norm,
        source="manual",
        status="PENDING",
        created_by_id=current_user.id,
    )
    db.add(orm)
    await db.flush()
    return _alias_to_out(orm)


# ── FSM transitions ────────────────────────────────────────────


@router.post("/location-aliases/{alias_id}/confirm", response_model=LocationAliasOut)
async def confirm_alias(
    alias_id: int,
    current_user: User = Depends(require_permission("update", "Location")),
    db: AsyncSession = Depends(get_db),
):
    orm = await _load_alias_or_404(alias_id, db)
    domain = alias_to_domain(orm)
    try:
        domain.confirm(user_id=current_user.id)
    except InvalidAliasTransition as e:
        raise HTTPException(status_code=409, detail=str(e))
    alias_to_orm(domain, orm)
    await db.flush()
    return _alias_to_out(orm)


@router.post("/location-aliases/{alias_id}/reject", response_model=LocationAliasOut)
async def reject_alias(
    alias_id: int,
    body: RejectAliasRequest = RejectAliasRequest(),
    current_user: User = Depends(require_permission("update", "Location")),
    db: AsyncSession = Depends(get_db),
):
    orm = await _load_alias_or_404(alias_id, db)
    domain = alias_to_domain(orm)
    try:
        domain.reject(user_id=current_user.id, note=body.note)
    except InvalidAliasTransition as e:
        raise HTTPException(status_code=409, detail=str(e))
    alias_to_orm(domain, orm)
    await db.flush()
    return _alias_to_out(orm)


@router.post("/location-aliases/{alias_id}/reopen", response_model=LocationAliasOut)
async def reopen_alias(
    alias_id: int,
    current_user: User = Depends(require_permission("update", "Location")),
    db: AsyncSession = Depends(get_db),
):
    orm = await _load_alias_or_404(alias_id, db)
    domain = alias_to_domain(orm)
    try:
        domain.reopen(user_id=current_user.id)
    except InvalidAliasTransition as e:
        raise HTTPException(status_code=409, detail=str(e))
    alias_to_orm(domain, orm)
    await db.flush()
    return _alias_to_out(orm)


# ── Merge locations ────────────────────────────────────────────


@router.post("/location-aliases/merge-locations", response_model=MergeLocationsResponse)
async def merge_locations(
    body: MergeLocationsRequest,
    current_user: User = Depends(require_permission("update", "Location")),
    db: AsyncSession = Depends(get_db),
):
    if body.source_location_id == body.target_location_id:
        raise HTTPException(status_code=400, detail="Cannot merge a location into itself")

    source_orm = await db.get(LocationORM, body.source_location_id)
    target_orm = await db.get(LocationORM, body.target_location_id)
    if source_orm is None:
        raise HTTPException(status_code=404, detail=f"Source location {body.source_location_id} not found")
    if target_orm is None:
        raise HTTPException(status_code=404, detail=f"Target location {body.target_location_id} not found")

    # Load source aliases
    source_aliases = (await db.execute(
        select(LocationAliasORM).where(LocationAliasORM.location_id == source_orm.id)
    )).scalars().all()

    source_domain = location_to_domain(source_orm, aliases=list(source_aliases))
    target_domain = location_to_domain(target_orm)

    source_domain.merge_into(target=target_domain, user_id=current_user.id)

    # Persist source location deactivation
    source_orm.is_active = False
    source_orm.updated_at = source_domain.updated_at

    # Persist alias FSM transitions
    for alias_dom in source_domain.aliases:
        if alias_dom.status == "MERGED" and alias_dom.id is not None:
            alias_orm = await db.get(LocationAliasORM, int(alias_dom.id))
            if alias_orm:
                alias_to_orm(alias_dom, alias_orm)

    # Move aliases to target location
    moved = (await db.execute(
        update(LocationAliasORM)
        .where(LocationAliasORM.location_id == body.source_location_id)
        .where(LocationAliasORM.status != "MERGED")
        .values(location_id=body.target_location_id)
    )).rowcount

    # Bulk-update FK references
    fk_updates: dict[str, int] = {}
    for table, col in [
        (WorkOrder, "pickup_location_id"),
        (WorkOrder, "dropoff_location_id"),
        (TripOrder, "pickup_location_id"),
        (TripOrder, "dropoff_location_id"),
        (Pricing, "pickup_location_id"),
        (Pricing, "dropoff_location_id"),
    ]:
        count = (await db.execute(
            update(table)
            .where(getattr(table, col) == body.source_location_id)
            .values(**{col: body.target_location_id})
        )).rowcount
        if count:
            fk_updates[f"{table.__tablename__}.{col}"] = count

    await db.flush()

    return MergeLocationsResponse(
        source_location_id=body.source_location_id,
        target_location_id=body.target_location_id,
        aliases_moved=moved,
        fk_updates=fk_updates,
    )


# ── Pending review ─────────────────────────────────────────────


@router.get("/locations/pending-review")
async def locations_pending_review(
    current_user: User = Depends(require_permission("read", "Location")),
    db: AsyncSession = Depends(get_db),
):
    """Locations that have PENDING aliases needing accountant review."""
    pending_alias_loc_ids = (await db.execute(
        select(LocationAliasORM.location_id)
        .where(LocationAliasORM.status == "PENDING")
        .distinct()
    )).scalars().all()

    if not pending_alias_loc_ids:
        return []

    locs = (await db.execute(
        select(LocationORM).where(LocationORM.id.in_(pending_alias_loc_ids))
    )).scalars().all()

    result = []
    for loc in locs:
        aliases = (await db.execute(
            select(LocationAliasORM)
            .where(LocationAliasORM.location_id == loc.id)
            .where(LocationAliasORM.status == "PENDING")
        )).scalars().all()
        result.append({
            "location": {"id": loc.id, "name": loc.name},
            "pending_aliases": [_alias_to_out(a) for a in aliases],
        })
    return result
