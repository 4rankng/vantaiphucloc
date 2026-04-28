from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.base import User
from app.models.domain import WorkOrder, TripOrder, TripOrderWorkOrder
from app.schemas.domain import ReconcileRequest, TripOrderOut
from app.core.deps import require_roles
from app.api.v1.trip_orders import _load_trip_order_out

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

    # Check if already matched
    if work_order.status == "MATCHED":
        raise HTTPException(status_code=409, detail="Work order is already matched")

    # Set work order status and earning
    work_order.status = "MATCHED"
    work_order.earning = trip_order.driver_salary + trip_order.allowance

    # Add to join table
    db.add(TripOrderWorkOrder(
        trip_order_id=trip_order.id,
        work_order_id=work_order.id,
    ))

    await db.commit()
    await db.refresh(trip_order)

    return await _load_trip_order_out(db, trip_order)
