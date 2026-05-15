"""Vehicle expense (CP Xe) CRUD endpoints.

Categories:
  XANG_DAU — Fuel costs
  SUA_CHUA — Repair / maintenance
  KHAC     — Other vehicle-specific costs  (DEPRECATED — removed)
  CHUNG    — General overhead (vehicle_id = NULL)

Expenses feed into the per-vehicle P&L report.
"""

from __future__ import annotations

import math
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, require_permission
from app.database import get_db
from app.models.base import User
from app.models.domain import Vehicle, VehicleExpense
from app.schemas.base import PaginatedResponse
from app.schemas.domain import VehicleExpenseCreate, VehicleExpenseOut, VehicleExpenseUpdate

router = APIRouter(prefix="/vehicle-expenses", tags=["vehicle-expenses"])


# ── helpers ──────────────────────────────────────────────────────────────────


async def _plate_map(db: AsyncSession, vehicle_ids: set[int]) -> dict[int, str]:
    if not vehicle_ids:
        return {}
    rows = (
        await db.execute(
            select(Vehicle.id, Vehicle.plate).where(Vehicle.id.in_(vehicle_ids))
        )
    ).all()
    return {r[0]: r[1] for r in rows}


def _to_out(exp: VehicleExpense, plates: dict[int, str]) -> VehicleExpenseOut:
    return VehicleExpenseOut(
        id=int(exp.id),  # type: ignore[arg-type]
        vehicle_id=exp.vehicle_id,
        vehicle_plate=plates.get(exp.vehicle_id) if exp.vehicle_id else None,
        category=exp.category,
        amount=exp.amount,
        expense_date=exp.expense_date,
        description=exp.description,
        receipt_url=exp.receipt_url,
        created_by=exp.created_by,
        created_at=exp.created_at,
        updated_at=exp.updated_at,
    )


# ── endpoints ────────────────────────────────────────────────────────────────


@router.get("", response_model=PaginatedResponse[VehicleExpenseOut])
async def list_vehicle_expenses(
    vehicle_id: int | None = Query(None),
    category: str | None = Query(None),
    date_from: date | None = Query(None),
    date_to: date | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    _current_user: User = Depends(require_permission("read", "Salary")),
    db: AsyncSession = Depends(get_db),
):
    q = select(VehicleExpense)
    if vehicle_id is not None:
        q = q.where(VehicleExpense.vehicle_id == vehicle_id)
    if category is not None:
        q = q.where(VehicleExpense.category == category.upper())
    if date_from is not None:
        q = q.where(VehicleExpense.expense_date >= date_from)
    if date_to is not None:
        q = q.where(VehicleExpense.expense_date <= date_to)

    from sqlalchemy import func as sa_func

    count_q = select(sa_func.count()).select_from(q.subquery())
    total = (await db.execute(count_q)).scalar() or 0

    q = q.order_by(VehicleExpense.expense_date.desc(), VehicleExpense.id.desc())
    q = q.offset((page - 1) * page_size).limit(page_size)
    expenses = (await db.execute(q)).scalars().all()

    vid_set = {e.vehicle_id for e in expenses if e.vehicle_id is not None}
    plates = await _plate_map(db, vid_set)

    return PaginatedResponse[VehicleExpenseOut](
        items=[_to_out(e, plates) for e in expenses],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(total / page_size) if total > 0 else 0,
    )


@router.post("", response_model=VehicleExpenseOut, status_code=201)
async def create_vehicle_expense(
    body: VehicleExpenseCreate,
    current_user: User = Depends(require_permission("calculate", "Salary")),
    db: AsyncSession = Depends(get_db),
):
    # Validate: CHUNG must have no vehicle_id; others should have one
    if body.category == "CHUNG" and body.vehicle_id is not None:
        raise HTTPException(
            status_code=422,
            detail="Category CHUNG (general overhead) must not be linked to a specific vehicle.",
        )
    if body.category != "CHUNG" and body.vehicle_id is None:
        raise HTTPException(
            status_code=422,
            detail=f"Category {body.category} requires a vehicle_id.",
        )
    if body.vehicle_id is not None:
        v = (
            await db.execute(select(Vehicle).where(Vehicle.id == body.vehicle_id))
        ).scalar_one_or_none()
        if v is None:
            raise HTTPException(status_code=404, detail="Vehicle not found")

    exp = VehicleExpense(
        vehicle_id=body.vehicle_id,
        category=body.category,
        amount=body.amount,
        expense_date=body.expense_date,
        description=body.description,
        receipt_url=body.receipt_url,
        created_by=current_user.id,
    )
    db.add(exp)
    await db.commit()
    await db.refresh(exp)

    plates = await _plate_map(db, {exp.vehicle_id} if exp.vehicle_id else set())
    return _to_out(exp, plates)


@router.get("/{expense_id}", response_model=VehicleExpenseOut)
async def get_vehicle_expense(
    expense_id: int,
    _current_user: User = Depends(require_permission("read", "Salary")),
    db: AsyncSession = Depends(get_db),
):
    exp = (
        await db.execute(select(VehicleExpense).where(VehicleExpense.id == expense_id))
    ).scalar_one_or_none()
    if exp is None:
        raise HTTPException(status_code=404, detail="Vehicle expense not found")
    plates = await _plate_map(db, {exp.vehicle_id} if exp.vehicle_id else set())
    return _to_out(exp, plates)


@router.put("/{expense_id}", response_model=VehicleExpenseOut)
async def update_vehicle_expense(
    expense_id: int,
    body: VehicleExpenseUpdate,
    _current_user: User = Depends(require_permission("calculate", "Salary")),
    db: AsyncSession = Depends(get_db),
):
    exp = (
        await db.execute(select(VehicleExpense).where(VehicleExpense.id == expense_id))
    ).scalar_one_or_none()
    if exp is None:
        raise HTTPException(status_code=404, detail="Vehicle expense not found")

    if body.vehicle_id is not None:
        exp.vehicle_id = body.vehicle_id
    if body.category is not None:
        exp.category = body.category
    if body.amount is not None:
        exp.amount = body.amount
    if body.expense_date is not None:
        exp.expense_date = body.expense_date
    if body.description is not None:
        exp.description = body.description
    if body.receipt_url is not None:
        exp.receipt_url = body.receipt_url

    await db.commit()
    await db.refresh(exp)
    plates = await _plate_map(db, {exp.vehicle_id} if exp.vehicle_id else set())
    return _to_out(exp, plates)


@router.delete("/{expense_id}", status_code=204)
async def delete_vehicle_expense(
    expense_id: int,
    _current_user: User = Depends(require_permission("calculate", "Salary")),
    db: AsyncSession = Depends(get_db),
):
    exp = (
        await db.execute(select(VehicleExpense).where(VehicleExpense.id == expense_id))
    ).scalar_one_or_none()
    if exp is None:
        raise HTTPException(status_code=404, detail="Vehicle expense not found")
    await db.delete(exp)
    await db.commit()
