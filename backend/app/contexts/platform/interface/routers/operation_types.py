"""CRUD endpoints for configurable operation types (tác nghiệp)."""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.database import get_db
from app.models.operation_type import OperationType
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


# ── Helpers ──────────────────────────────────────────────────────────────────


async def _refresh_cache(db: AsyncSession) -> None:
    """Reload active work types from DB into the validation cache."""
    rows = (await db.execute(
        select(OperationType.name).where(OperationType.is_active == True)  # noqa: E712
    )).scalars().all()
    refresh_work_types_from_async(frozenset(rows))


# ── Endpoints ────────────────────────────────────────────────────────────────


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
