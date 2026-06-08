"""CRUD endpoints for configurable operation types (tác nghiệp) + aliases."""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.database import get_db
from app.models.operation_type import OperationType, OperationTypeAlias
from app.models.base import User
from app.contexts.route_pricing.domain.value_objects import refresh_work_types_from_async

router = APIRouter(prefix="/operation-types", tags=["operation-types"])


# ── Schemas ──────────────────────────────────────────────────────────────────


class OperationTypeOut(BaseModel):
    id: int
    name: str
    label: str
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


class OperationTypeCreate(BaseModel):
    name: str
    label: str


class OperationTypeUpdate(BaseModel):
    name: str | None = None
    label: str | None = None
    is_active: bool | None = None


class OperationTypeAliasOut(BaseModel):
    id: int
    operation_type_id: int
    operation_type_name: str | None = None
    alias: str
    alias_normalized: str
    source: str
    created_at: datetime
    created_by_id: int | None = None

    model_config = ConfigDict(from_attributes=True)


class CreateOperationTypeAliasRequest(BaseModel):
    operation_type_id: int
    alias: str


# ── Helpers ──────────────────────────────────────────────────────────────────


async def _refresh_cache(db: AsyncSession) -> None:
    """Reload active work types from DB into the validation cache."""
    rows = (await db.execute(
        select(OperationType.name).where(OperationType.is_active == True)  # noqa: E712
    )).scalars().all()
    refresh_work_types_from_async(frozenset(rows))


def _normalize_alias(alias: str) -> str:
    """Normalize alias for dedup — diacritics-insensitive."""
    from app.contexts.operations.infrastructure.operation_type_resolver import normalize_operation_type
    return normalize_operation_type(alias)


# ── Operation Type CRUD ──────────────────────────────────────────────────────


@router.get("", response_model=list[OperationTypeOut])
async def list_operation_types(
    active_only: bool = False,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """List all operation types. Pass ?active_only=true to filter."""
    stmt = select(OperationType).order_by(OperationType.id)
    if active_only:
        stmt = stmt.where(OperationType.is_active == True)  # noqa: E712
    rows = (await db.execute(stmt)).scalars().all()
    return rows


@router.post("", response_model=OperationTypeOut, status_code=201)
async def create_operation_type(
    body: OperationTypeCreate,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    exists = (
        await db.execute(
            select(OperationType).where(OperationType.name == body.name)
        )
    ).scalar_one_or_none()
    if exists:
        raise HTTPException(409, f"Tác nghiệp '{body.name}' đã tồn tại")
    obj = OperationType(name=body.name, label=body.label)
    db.add(obj)
    await db.flush()
    await db.refresh(obj)
    await _refresh_cache(db)
    return obj


@router.put("/{type_id}", response_model=OperationTypeOut)
async def update_operation_type(
    type_id: int,
    body: OperationTypeUpdate,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    obj = await db.get(OperationType, type_id)
    if not obj:
        raise HTTPException(404, "Không tìm thấy tác nghiệp")
    if body.name is not None and body.name != obj.name:
        # Check for name collision with another type
        exists = (
            await db.execute(
                select(OperationType).where(OperationType.name == body.name)
            )
        ).scalar_one_or_none()
        if exists:
            raise HTTPException(409, f"Tác nghiệp '{body.name}' đã tồn tại")
        obj.name = body.name
    if body.label is not None:
        obj.label = body.label
    if body.is_active is not None:
        obj.is_active = body.is_active
    await db.flush()
    await db.refresh(obj)
    await _refresh_cache(db)
    return obj


@router.delete("/{type_id}")
async def delete_operation_type(
    type_id: int,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    obj = await db.get(OperationType, type_id)
    if not obj:
        raise HTTPException(404, "Không tìm thấy tác nghiệp")

    # Check if used in any trip or pricing
    from app.models.domain import (
        DeliveredTrip,
        BookedTrip,
        RoutePricing,
        VendorRoutePricing,
    )

    name = obj.name
    for Model, label in [
        (DeliveredTrip, "chuyến đã giao"),
        (BookedTrip, "chuyến đặt"),
        (RoutePricing, "cước tuyến"),
        (VendorRoutePricing, "cước xe ngoài"),
    ]:
        count = (
            await db.execute(
                select(func.count()).select_from(Model).where(Model.work_type == name)
            )
        ).scalar()
        if count > 0:
            raise HTTPException(
                409,
                f"Không thể xóa — đang được dùng trong {count} {label}. "
                f"Ẩn thay vì xóa.",
            )
    await db.delete(obj)
    await db.flush()
    await _refresh_cache(db)
    return {"success": True}


# ── Alias CRUD ───────────────────────────────────────────────────────────────


@router.get("/aliases", response_model=list[OperationTypeAliasOut])
async def list_aliases(
    operation_type_id: int | None = None,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """List operation type aliases. Optional ?operation_type_id= filter."""
    stmt = select(OperationTypeAlias, OperationType.name.label("operation_type_name")).join(
        OperationType, OperationTypeAlias.operation_type_id == OperationType.id
    ).order_by(OperationTypeAlias.created_at.desc())
    if operation_type_id is not None:
        stmt = stmt.where(OperationTypeAlias.operation_type_id == operation_type_id)
    rows = (await db.execute(stmt)).all()
    return [
        {
            "id": r.OperationTypeAlias.id,
            "operation_type_id": r.OperationTypeAlias.operation_type_id,
            "operation_type_name": r.operation_type_name,
            "alias": r.OperationTypeAlias.alias,
            "alias_normalized": r.OperationTypeAlias.alias_normalized,
            "source": r.OperationTypeAlias.source,
            "created_at": r.OperationTypeAlias.created_at,
            "created_by_id": r.OperationTypeAlias.created_by_id,
        }
        for r in rows
    ]


@router.post("/aliases", response_model=OperationTypeAliasOut, status_code=201)
async def create_alias(
    body: CreateOperationTypeAliasRequest,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """Create a new alias for an operation type."""
    op_type = await db.get(OperationType, body.operation_type_id)
    if not op_type:
        raise HTTPException(404, "Không tìm thấy tác nghiệp")

    norm = _normalize_alias(body.alias)
    if not norm:
        raise HTTPException(400, "Tên phụ không được để trống")

    # Check if alias_normalized already exists
    existing = (
        await db.execute(
            select(OperationTypeAlias).where(OperationTypeAlias.alias_normalized == norm)
        )
    ).scalar_one_or_none()
    if existing:
        # Re-point to the new operation type
        existing.operation_type_id = body.operation_type_id
        existing.alias = body.alias.strip()
        existing.source = "manual"
        await db.flush()
        await db.refresh(existing)
        return {
            "id": existing.id,
            "operation_type_id": existing.operation_type_id,
            "operation_type_name": op_type.name,
            "alias": existing.alias,
            "alias_normalized": existing.alias_normalized,
            "source": existing.source,
            "created_at": existing.created_at,
            "created_by_id": existing.created_by_id,
        }

    alias = OperationTypeAlias(
        operation_type_id=body.operation_type_id,
        alias=body.alias.strip(),
        alias_normalized=norm,
        source="manual",
    )
    db.add(alias)
    await db.flush()
    await db.refresh(alias)
    return {
        "id": alias.id,
        "operation_type_id": alias.operation_type_id,
        "operation_type_name": op_type.name,
        "alias": alias.alias,
        "alias_normalized": alias.alias_normalized,
        "source": alias.source,
        "created_at": alias.created_at,
        "created_by_id": alias.created_by_id,
    }


@router.post("/aliases/{alias_id}/promote", response_model=OperationTypeAliasOut)
async def promote_alias(
    alias_id: int,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """Swap alias with canonical OperationType name."""
    alias = await db.get(OperationTypeAlias, alias_id)
    if not alias:
        raise HTTPException(404, "Không tìm thấy tên phụ")

    op_type = await db.get(OperationType, alias.operation_type_id)
    if not op_type:
        raise HTTPException(404, "Không tìm thấy tác nghiệp")

    old_name = op_type.name
    new_name = alias.alias

    # Check for name collision
    collision = (
        await db.execute(
            select(OperationType).where(OperationType.name == new_name)
        )
    ).scalar_one_or_none()
    if collision and collision.id != op_type.id:
        raise HTTPException(409, f"Tác nghiệp '{new_name}' đã tồn tại")

    # Swap: alias becomes canonical, canonical becomes alias
    op_type.name = new_name
    alias.alias = old_name
    alias.alias_normalized = _normalize_alias(old_name)
    alias.source = "promote"
    await db.flush()
    await db.refresh(op_type)
    await db.refresh(alias)
    await _refresh_cache(db)
    return {
        "id": alias.id,
        "operation_type_id": alias.operation_type_id,
        "operation_type_name": op_type.name,
        "alias": alias.alias,
        "alias_normalized": alias.alias_normalized,
        "source": alias.source,
        "created_at": alias.created_at,
        "created_by_id": alias.created_by_id,
    }


@router.delete("/aliases/{alias_id}")
async def delete_alias(
    alias_id: int,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """Delete an operation type alias."""
    alias = await db.get(OperationTypeAlias, alias_id)
    if not alias:
        raise HTTPException(404, "Không tìm thấy tên phụ")
    await db.delete(alias)
    await db.flush()
    return {"success": True}
