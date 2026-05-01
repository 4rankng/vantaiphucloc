import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.base import User
from app.models.domain import WorkOrder, TripOrder, TripOrderWorkOrder
from app.schemas.domain import (
    ReconcileRequest,
    TripOrderOut,
    SuggestMatchesResponse,
    SuggestWosResponse,
)
from app.core.deps import require_roles
from app.api.v1.trip_orders import _load_trip_order_out, _enqueue_salary_recalc
from app.services.matching_service import suggest_trip_matches, suggest_wo_matches

_logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/reconcile", response_model=TripOrderOut)
async def reconcile(
    body: ReconcileRequest,
    current_user: User = Depends(require_roles("accountant", "superadmin")),
    db: AsyncSession = Depends(get_db),
):
    # Load work order
    wo_result = await db.execute(
        select(WorkOrder).where(WorkOrder.id == body.work_order_id)
    )
    work_order = wo_result.scalar_one_or_none()
    if work_order is None:
        raise HTTPException(status_code=404, detail="Work order not found")

    # Load trip order
    to_result = await db.execute(
        select(TripOrder).where(TripOrder.id == body.trip_order_id)
    )
    trip_order = to_result.scalar_one_or_none()
    if trip_order is None:
        raise HTTPException(status_code=404, detail="Trip order not found")

    # Check if already matched or completed
    if work_order.status in ("MATCHED", "COMPLETED"):
        raise HTTPException(status_code=409, detail="Work order is already matched")

    # Sync salary fields from TO to WO
    work_order.driver_salary = trip_order.driver_salary
    work_order.allowance = trip_order.allowance
    work_order.earning = trip_order.driver_salary + trip_order.allowance
    # WO.unit_price stays 0 (revenue tracked in TO only)

    # Determine WO status based on whether TO has pricing data
    if trip_order.unit_price > 0 and trip_order.driver_salary > 0:
        work_order.status = "COMPLETED"
    else:
        work_order.status = "MATCHED"

    # Add to join table
    db.add(TripOrderWorkOrder(
        trip_order_id=trip_order.id,
        work_order_id=work_order.id,
    ))

    await db.commit()
    await db.refresh(trip_order)

    ref_date = work_order.created_at.date() if work_order.created_at else trip_order.trip_date
    await _enqueue_salary_recalc(db, work_order.driver_id, ref_date)

    return await _load_trip_order_out(db, trip_order)


@router.get("/suggest-matches/{work_order_id}", response_model=SuggestMatchesResponse)
async def suggest_matches(
    work_order_id: int,
    current_user: User = Depends(require_roles("accountant", "superadmin")),
    db: AsyncSession = Depends(get_db),
):
    wo_result = await db.execute(
        select(WorkOrder).where(WorkOrder.id == work_order_id)
    )
    work_order = wo_result.scalar_one_or_none()
    if work_order is None:
        raise HTTPException(status_code=404, detail="Work order not found")

    suggestions = await suggest_trip_matches(db, work_order)
    return SuggestMatchesResponse(
        work_order_id=work_order_id,
        suggestions=suggestions,
    )


@router.get("/suggest-wos/{trip_order_id}", response_model=SuggestWosResponse)
async def suggest_wos(
    trip_order_id: int,
    current_user: User = Depends(require_roles("accountant", "superadmin")),
    db: AsyncSession = Depends(get_db),
):
    to_result = await db.execute(
        select(TripOrder).where(TripOrder.id == trip_order_id)
    )
    trip_order = to_result.scalar_one_or_none()
    if trip_order is None:
        raise HTTPException(status_code=404, detail="Trip order not found")

    suggestions = await suggest_wo_matches(db, trip_order)
    return SuggestWosResponse(
        trip_order_id=trip_order_id,
        suggestions=suggestions,
    )
