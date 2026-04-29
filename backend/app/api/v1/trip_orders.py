import math
import logging
from collections import defaultdict
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, func

from app.database import get_db
from app.models.base import User
from app.models.domain import TripOrder, TripOrderWorkOrder, WorkOrder
from app.schemas.base import PaginatedResponse
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


async def _batch_get_matched_work_order_ids(
    db: AsyncSession, trip_order_ids: list[int]
) -> dict[int, list[int]]:
    """Batch-load matched work order IDs for multiple trip orders."""
    if not trip_order_ids:
        return {}
    result = await db.execute(
        select(
            TripOrderWorkOrder.trip_order_id,
            TripOrderWorkOrder.work_order_id,
        ).where(
            TripOrderWorkOrder.trip_order_id.in_(trip_order_ids)
        )
    )
    mapping: dict[int, list[int]] = defaultdict(list)
    for row in result.all():
        mapping[row[0]].append(row[1])
    return mapping


async def _load_trip_order_out(db: AsyncSession, trip_order: TripOrder) -> TripOrderOut:
    """Load a TripOrder with matched work order IDs and return a TripOrderOut."""
    matched_ids = await _get_matched_work_order_ids(db, trip_order.id)
    data = {
        col.name: getattr(trip_order, col.name)
        for col in TripOrder.__table__.columns
    }
    data["matched_work_order_ids"] = matched_ids
    return TripOrderOut.model_validate(data)


async def _batch_load_trip_order_outs(
    db: AsyncSession, trip_orders: list[TripOrder]
) -> list[TripOrderOut]:
    """Batch-load matched work order IDs for multiple trip orders."""
    if not trip_orders:
        return []

    to_ids = [to.id for to in trip_orders]
    mapping = await _batch_get_matched_work_order_ids(db, to_ids)

    return [
        TripOrderOut.model_validate({
            **{col.name: getattr(to, col.name) for col in TripOrder.__table__.columns},
            "matched_work_order_ids": mapping.get(to.id, []),
        })
        for to in trip_orders
    ]


async def _set_work_orders_matched(db: AsyncSession, work_order_ids: list[int]) -> None:
    """Set status = MATCHED on each referenced work order."""
    for wo_id in work_order_ids:
        result = await db.execute(select(WorkOrder).where(WorkOrder.id == wo_id))
        wo = result.scalar_one_or_none()
        if wo is not None:
            wo.status = "MATCHED"


async def _enqueue_salary_recalc(db: AsyncSession, driver_id: int, ref_date: date) -> None:
    """Enqueue salary recalculation for a driver in the period containing ref_date."""
    try:
        from app.workers import enqueue, salary_recalc_job_id
        start, end = await get_salary_period_dates(db, ref_date)
        job_id = salary_recalc_job_id(driver_id, start.isoformat(), end.isoformat())
        await enqueue(
            "calculate_salary_task",
            _job_id=job_id,
            driver_id=driver_id,
            start_date=start.isoformat(),
            end_date=end.isoformat(),
        )
    except RuntimeError:
        _logger.warning("Failed to enqueue salary recalculation for driver %s", driver_id)


@router.post("/trip-orders", response_model=TripOrderOut, status_code=201)
async def create_trip_order(
    body: TripOrderCreate,
    current_user: User = Depends(require_roles("accountant", "superadmin")),
    db: AsyncSession = Depends(get_db),
):
    matched_ids = body.matched_work_order_ids
    trip_data = body.model_dump(exclude={"matched_work_order_ids"})

    trip_order = TripOrder(
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

    await _enqueue_salary_recalc(db, trip_order.driver_id, body.trip_date)

    return await _load_trip_order_out(db, trip_order)


@router.get("/trip-orders", response_model=PaginatedResponse[TripOrderOut])
async def list_trip_orders(
    client_id: int | None = None,
    driver_id: int | None = None,
    status: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    current_user: User = Depends(require_roles("accountant", "director", "superadmin")),
    db: AsyncSession = Depends(get_db),
):
    query = select(TripOrder)
    count_query = select(func.count(TripOrder.id))

    if client_id is not None:
        query = query.where(TripOrder.client_id == client_id)
        count_query = count_query.where(TripOrder.client_id == client_id)
    if driver_id is not None:
        query = query.where(TripOrder.driver_id == driver_id)
        count_query = count_query.where(TripOrder.driver_id == driver_id)
    if status is not None:
        query = query.where(TripOrder.status == status)
        count_query = count_query.where(TripOrder.status == status)
    if date_from is not None:
        query = query.where(TripOrder.trip_date >= date_from)
        count_query = count_query.where(TripOrder.trip_date >= date_from)
    if date_to is not None:
        query = query.where(TripOrder.trip_date <= date_to)
        count_query = count_query.where(TripOrder.trip_date <= date_to)

    total_q = await db.execute(count_query)
    total = total_q.scalar() or 0

    result = await db.execute(
        query.order_by(TripOrder.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    trip_orders = result.scalars().all()

    # Batch-load matched IDs instead of per-row queries
    items = await _batch_load_trip_order_outs(db, trip_orders)

    return PaginatedResponse[TripOrderOut](
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(total / page_size) if total > 0 else 0,
    )


@router.get("/trip-orders/{trip_order_id}", response_model=TripOrderOut)
async def get_trip_order(
    trip_order_id: int,
    current_user: User = Depends(require_roles("accountant", "director", "superadmin")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(TripOrder).where(TripOrder.id == trip_order_id)
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
        select(TripOrder).where(TripOrder.id == trip_order_id)
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
        ref_date = trip_order.trip_date if hasattr(trip_order, "trip_date") and trip_order.trip_date else date.today()
        await _enqueue_salary_recalc(db, trip_order.driver_id, ref_date)

    return await _load_trip_order_out(db, trip_order)
