from datetime import date
import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from app.database import get_db
from app.models.base import User
from app.models.domain import TripOrder, TripOrderWorkOrder, WorkOrder
from app.schemas.domain import TripOrderCreate, TripOrderUpdate, TripOrderOut
from app.core.deps import get_current_user, require_roles
from app.services.salary_service import get_salary_period_dates

_logger = logging.getLogger(__name__)

router = APIRouter()


async def _get_matched_work_order_ids(db: AsyncSession, trip_order_id: int) -> list[int]:
    """Load matched work order IDs for a trip order from the join table."""
    result = await db.execute(
        select(TripOrderWorkOrder.work_order_id).where(
            TripOrderWorkOrder.trip_order_id == trip_order_id
        )
    )
    return [row[0] for row in result.all()]


async def _load_trip_order_out(db: AsyncSession, trip_order: TripOrder) -> TripOrderOut:
    """Load a TripOrder with matched work order IDs and return a TripOrderOut."""
    matched_ids = await _get_matched_work_order_ids(db, trip_order.id)
    data = {
        col.name: getattr(trip_order, col.name)
        for col in TripOrder.__table__.columns
    }
    data["matched_work_order_ids"] = matched_ids
    return TripOrderOut.model_validate(data)


async def _set_work_orders_matched(db: AsyncSession, work_order_ids: list[int]) -> None:
    """Set status = MATCHED on each referenced work order."""
    for wo_id in work_order_ids:
        result = await db.execute(select(WorkOrder).where(WorkOrder.id == wo_id))
        wo = result.scalar_one_or_none()
        if wo is not None:
            wo.status = "MATCHED"


@router.post("/trip-orders", response_model=TripOrderOut, status_code=201)
async def create_trip_order(
    body: TripOrderCreate,
    current_user: User = Depends(require_roles("accountant", "superadmin")),
    db: AsyncSession = Depends(get_db),
):
    matched_ids = body.matched_work_order_ids
    trip_data = body.model_dump(exclude={"matched_work_order_ids"})

    trip_order = TripOrder(
        company_id=current_user.company_id,
        status="DRAFT",
        **trip_data,
    )
    db.add(trip_order)
    await db.flush()

    for wo_id in matched_ids:
        db.add(TripOrderWorkOrder(
            trip_order_id=trip_order.id,
            work_order_id=wo_id,
        ))

    if matched_ids:
        await _set_work_orders_matched(db, matched_ids)

    await db.commit()
    await db.refresh(trip_order)

    # Enqueue salary recalculation for the driver
    try:
        from app.workers import enqueue, salary_recalc_job_id
        start, end = await get_salary_period_dates(db, current_user.company_id, body.trip_date)
        job_id = salary_recalc_job_id(current_user.company_id, trip_order.driver_id, start.isoformat(), end.isoformat())
        await enqueue(
            "calculate_salary_task",
            _job_id=job_id,
            company_id=current_user.company_id,
            driver_id=trip_order.driver_id,
            start_date=start.isoformat(),
            end_date=end.isoformat(),
        )
    except RuntimeError:
        _logger.warning("Failed to enqueue salary recalculation for driver %s", trip_order.driver_id)

    return await _load_trip_order_out(db, trip_order)


@router.get("/trip-orders", response_model=list[TripOrderOut])
async def list_trip_orders(
    client_id: int | None = None,
    driver_id: int | None = None,
    status: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    current_user: User = Depends(require_roles("accountant", "director", "superadmin")),
    db: AsyncSession = Depends(get_db),
):
    query = select(TripOrder).where(TripOrder.company_id == current_user.company_id)

    if client_id is not None:
        query = query.where(TripOrder.client_id == client_id)
    if driver_id is not None:
        query = query.where(TripOrder.driver_id == driver_id)
    if status is not None:
        query = query.where(TripOrder.status == status)
    if date_from is not None:
        query = query.where(TripOrder.trip_date >= date_from)
    if date_to is not None:
        query = query.where(TripOrder.trip_date <= date_to)

    result = await db.execute(query.order_by(TripOrder.id.desc()))
    trip_orders = result.scalars().all()

    return [await _load_trip_order_out(db, to) for to in trip_orders]


@router.get("/trip-orders/{trip_order_id}", response_model=TripOrderOut)
async def get_trip_order(
    trip_order_id: int,
    current_user: User = Depends(require_roles("accountant", "director", "superadmin")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(TripOrder).where(
            TripOrder.id == trip_order_id,
            TripOrder.company_id == current_user.company_id,
        )
    )
    trip_order = result.scalar_one_or_none()
    if trip_order is None:
        raise HTTPException(status_code=404, detail="Trip order not found")

    return await _load_trip_order_out(db, trip_order)


@router.put("/trip-orders/{trip_order_id}", response_model=TripOrderOut)
async def update_trip_order(
    trip_order_id: int,
    body: TripOrderUpdate,
    current_user: User = Depends(require_roles("accountant", "superadmin")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(TripOrder).where(
            TripOrder.id == trip_order_id,
            TripOrder.company_id == current_user.company_id,
        )
    )
    trip_order = result.scalar_one_or_none()
    if trip_order is None:
        raise HTTPException(status_code=404, detail="Trip order not found")

    update_data = body.model_dump(exclude_unset=True)
    new_matched_ids = update_data.pop("matched_work_order_ids", None)

    for field, value in update_data.items():
        setattr(trip_order, field, value)

    if new_matched_ids is not None:
        # Remove old join table entries that are no longer in the list
        existing_ids = await _get_matched_work_order_ids(db, trip_order.id)
        removed_ids = set(existing_ids) - set(new_matched_ids)
        for wo_id in removed_ids:
            await db.execute(
                delete(TripOrderWorkOrder).where(
                    TripOrderWorkOrder.trip_order_id == trip_order.id,
                    TripOrderWorkOrder.work_order_id == wo_id,
                )
            )

        # Add new join table entries
        for wo_id in new_matched_ids:
            if wo_id not in existing_ids:
                db.add(TripOrderWorkOrder(
                    trip_order_id=trip_order.id,
                    work_order_id=wo_id,
                ))
        await _set_work_orders_matched(db, new_matched_ids)

    await db.commit()
    await db.refresh(trip_order)

    # Enqueue salary recalculation if matched work orders changed
    if new_matched_ids:
        try:
            from app.workers import enqueue, salary_recalc_job_id
            ref_date = trip_order.trip_date if hasattr(trip_order, "trip_date") and trip_order.trip_date else date.today()
            start, end = await get_salary_period_dates(db, current_user.company_id, ref_date)
            job_id = salary_recalc_job_id(current_user.company_id, trip_order.driver_id, start.isoformat(), end.isoformat())
            await enqueue(
                "calculate_salary_task",
                _job_id=job_id,
                company_id=current_user.company_id,
                driver_id=trip_order.driver_id,
                start_date=start.isoformat(),
                end_date=end.isoformat(),
            )
        except RuntimeError:
            _logger.warning("Failed to enqueue salary recalculation for driver %s", trip_order.driver_id)

    return await _load_trip_order_out(db, trip_order)
