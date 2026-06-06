"""Location alias HTTP endpoints — CRUD + merge."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.contexts.customer_pricing.infrastructure.location_resolver import normalize
from app.core.deps import require_permission
from app.database import get_db
from app.models.base import User
from app.models.domain import (
    BookedTrip,
    DeliveredTrip,
    RoutePricing,
    VendorRoutePricing,
)
from app.schemas.domain import (
    CreateAliasRequest,
    LocationAliasOut,
    MergeLocationsRequest,
    MergeLocationsResponse,
)

router = APIRouter()


# ── Helpers ────────────────────────────────────────────────────


def _alias_to_out(a, location_name: str | None = None) -> LocationAliasOut:
    return LocationAliasOut(
        id=int(a.id),
        location_id=int(a.location_id),
        location_name=location_name,
        alias=a.alias,
        alias_normalized=a.alias_normalized,
        source=a.source,
        created_at=a.created_at,
        created_by_id=a.created_by_id,
    )


async def _load_alias_or_404(alias_id: int, db: AsyncSession):
    from app.contexts.customer_pricing.infrastructure.orm import LocationAliasORM
    orm = await db.get(LocationAliasORM, alias_id)
    if orm is None:
        raise HTTPException(status_code=404, detail=f"LocationAlias {alias_id} not found")
    return orm


# ── CRUD ───────────────────────────────────────────────────────


@router.get("/location-aliases", response_model=list[LocationAliasOut])
async def list_aliases(
    location_id: int | None = Query(None),
    current_user: User = Depends(require_permission("read", "Location")),
    db: AsyncSession = Depends(get_db),
):
    from app.contexts.customer_pricing.infrastructure.orm import LocationAliasORM, LocationORM
    q = (
        select(LocationAliasORM, LocationORM.name.label("location_name"))
        .join(LocationORM, LocationORM.id == LocationAliasORM.location_id)
    )
    if location_id:
        q = q.where(LocationAliasORM.location_id == location_id)
    q = q.order_by(LocationAliasORM.created_at.desc())
    rows = (await db.execute(q)).all()
    return [_alias_to_out(alias_orm, location_name=loc_name) for alias_orm, loc_name in rows]


@router.post("/location-aliases", response_model=LocationAliasOut, status_code=201)
async def create_alias(
    body: CreateAliasRequest,
    current_user: User = Depends(require_permission("update", "Location")),
    db: AsyncSession = Depends(get_db),
):
    from app.contexts.customer_pricing.infrastructure.orm import LocationAliasORM, LocationORM
    loc = await db.get(LocationORM, body.location_id)
    if loc is None:
        raise HTTPException(status_code=404, detail=f"Location {body.location_id} not found")

    norm = normalize(body.alias)
    existing = (await db.execute(
        select(LocationAliasORM).where(LocationAliasORM.alias_normalized == norm)
    )).scalar_one_or_none()
    if existing is not None:
        existing.location_id = body.location_id
        existing.alias = body.alias[:255]
        await db.flush()
        return _alias_to_out(existing)

    orm = LocationAliasORM(
        location_id=body.location_id,
        alias=body.alias[:255],
        alias_normalized=norm,
        source="manual",
        created_by_id=current_user.id,
    )
    db.add(orm)
    await db.flush()
    return _alias_to_out(orm)


@router.post("/location-aliases/{alias_id}/promote", response_model=LocationAliasOut)
async def promote_alias(
    alias_id: int,
    current_user: User = Depends(require_permission("update", "Location")),
    db: AsyncSession = Depends(get_db),
):
    from app.contexts.customer_pricing.infrastructure.orm import LocationAliasORM, LocationORM
    alias_orm = await _load_alias_or_404(alias_id, db)
    loc_orm = await db.get(LocationORM, alias_orm.location_id)
    if loc_orm is None:
        raise HTTPException(status_code=404, detail="Location not found")

    new_loc_name = alias_orm.alias[:255]
    old_name = loc_orm.name

    name_taken = (await db.execute(
        select(LocationORM).where(
            LocationORM.name == new_loc_name,
            LocationORM.id != loc_orm.id,
        )
    )).scalar_one_or_none()
    if name_taken is not None:
        raise HTTPException(
            status_code=409,
            detail=f"Tên địa điểm '{new_loc_name}' đã tồn tại",
        )

    old_name_norm = normalize(old_name)
    norm_collision = (await db.execute(
        select(LocationAliasORM).where(
            LocationAliasORM.alias_normalized == old_name_norm,
            LocationAliasORM.id != alias_orm.id,
        )
    )).scalar_one_or_none()
    if norm_collision is not None:
        raise HTTPException(
            status_code=409,
            detail=f"Bí danh đã tồn tại với tên chuẩn hóa '{old_name_norm}'",
        )

    loc_orm.name = new_loc_name
    alias_orm.alias = old_name
    alias_orm.alias_normalized = old_name_norm
    await db.flush()
    return _alias_to_out(alias_orm)


@router.delete("/location-aliases/{alias_id}", status_code=204)
async def delete_alias(
    alias_id: int,
    current_user: User = Depends(require_permission("update", "Location")),
    db: AsyncSession = Depends(get_db),
):
    orm = await _load_alias_or_404(alias_id, db)
    await db.delete(orm)
    await db.flush()


# ── Merge locations ────────────────────────────────────────────


@router.post("/location-aliases/merge-locations", response_model=MergeLocationsResponse)
async def merge_locations(
    body: MergeLocationsRequest,
    current_user: User = Depends(require_permission("update", "Location")),
    db: AsyncSession = Depends(get_db),
):
    from app.contexts.customer_pricing.infrastructure.orm import LocationAliasORM, LocationORM
    if body.source_location_id == body.target_location_id:
        raise HTTPException(status_code=400, detail="Cannot merge a location into itself")

    source_orm = await db.get(LocationORM, body.source_location_id)
    target_orm = await db.get(LocationORM, body.target_location_id)
    if source_orm is None:
        raise HTTPException(status_code=404, detail=f"Source location {body.source_location_id} not found")
    if target_orm is None:
        raise HTTPException(status_code=404, detail=f"Target location {body.target_location_id} not found")

    # Preserve the source location's name as an alias on the target so future
    # imports/lookups of the old name still resolve to the merged location.
    source_name_norm = normalize(source_orm.name)
    target_name_norm = normalize(target_orm.name)
    if source_name_norm and source_name_norm != target_name_norm:
        # Check if an alias with the same normalized form already exists anywhere.
        existing = (await db.execute(
            select(LocationAliasORM).where(LocationAliasORM.alias_normalized == source_name_norm)
        )).scalar_one_or_none()
        if existing is None:
            db.add(LocationAliasORM(
                location_id=body.target_location_id,
                alias=source_orm.name[:255],
                alias_normalized=source_name_norm,
                source="merge",
                created_by_id=current_user.id,
            ))
        else:
            # Re-point any existing alias to the target (so it survives the merge).
            existing.location_id = body.target_location_id
        await db.flush()

    # Deactivate source location
    source_orm.is_active = False

    # Move aliases to target location
    moved = (await db.execute(
        update(LocationAliasORM)
        .where(LocationAliasORM.location_id == body.source_location_id)
        .values(location_id=body.target_location_id)
    )).rowcount

    # Bulk-update FK references
    fk_updates: dict[str, int] = {}
    for table, col in [
        (DeliveredTrip, "pickup_location_id"),
        (DeliveredTrip, "dropoff_location_id"),
        (BookedTrip, "pickup_location_id"),
        (BookedTrip, "dropoff_location_id"),
        (RoutePricing, "pickup_location_id"),
        (RoutePricing, "dropoff_location_id"),
        (VendorRoutePricing, "pickup_location_id"),
        (VendorRoutePricing, "dropoff_location_id"),
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
