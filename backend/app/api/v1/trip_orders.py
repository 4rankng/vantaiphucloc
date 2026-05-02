import io
import math
import logging
from collections import defaultdict
from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, func

from app.database import get_db
from app.models.base import User
from app.models.domain import TripOrder, TripOrderContainer, TripOrderWorkOrder, WorkOrder, Client
from app.schemas.base import PaginatedResponse
from app.schemas.domain import TripOrderCreate, TripOrderUpdate, TripOrderOut, TripContainerOut, CancelRequest
from app.core.deps import get_current_user, require_roles
from app.services.salary_service import get_salary_period_dates
from app.services.audit_service import log_action
from app.core.audit_context import set_audit_reason
from app.workers import enqueue
from app.validators.container import validate_container_quantity, validate_same_work_type

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


async def _get_trip_containers(db: AsyncSession, trip_order_id: int) -> list[TripContainerOut]:
    """Load containers for a single trip order."""
    result = await db.execute(
        select(TripOrderContainer).where(TripOrderContainer.trip_order_id == trip_order_id)
    )
    return [TripContainerOut.model_validate(c) for c in result.scalars().all()]


async def _batch_get_trip_containers(
    db: AsyncSession, trip_order_ids: list[int]
) -> dict[int, list[TripContainerOut]]:
    """Batch-load containers for multiple trip orders."""
    if not trip_order_ids:
        return {}
    result = await db.execute(
        select(TripOrderContainer).where(TripOrderContainer.trip_order_id.in_(trip_order_ids))
    )
    mapping: dict[int, list[TripContainerOut]] = defaultdict(list)
    for c in result.scalars().all():
        mapping[c.trip_order_id].append(TripContainerOut.model_validate(c))
    return mapping


async def _load_trip_order_out(db: AsyncSession, trip_order: TripOrder) -> TripOrderOut:
    """Load a TripOrder with matched work order IDs and containers."""
    matched_ids = await _get_matched_work_order_ids(db, trip_order.id)
    containers = await _get_trip_containers(db, trip_order.id)
    return TripOrderOut(
        id=trip_order.id,
        trip_date=trip_order.trip_date,
        client_id=trip_order.client_id,
        client_name=trip_order.client_name,
        code=trip_order.code,
        work_type=trip_order.work_type,
        route=trip_order.route,
        pickup_location=trip_order.pickup_location,
        dropoff_location=trip_order.dropoff_location,
        tractor_plate=trip_order.tractor_plate,
        driver_id=trip_order.driver_id,
        driver_name=trip_order.driver_name,
        container_number=trip_order.container_number,
        containers=containers,
        pricing_id=trip_order.pricing_id,
        unit_price=trip_order.unit_price,
        driver_salary=trip_order.driver_salary,
        allowance=trip_order.allowance,
        revenue=trip_order.revenue,
        status=trip_order.status,
        is_confirmed=trip_order.is_confirmed,
        confirmed_by=trip_order.confirmed_by,
        confirmed_at=trip_order.confirmed_at,
        is_locked=getattr(trip_order, 'is_locked', False),
        locked_at=getattr(trip_order, 'locked_at', None),
        locked_by=getattr(trip_order, 'locked_by', None),
        matched_work_order_ids=matched_ids,
        created_at=trip_order.created_at,
        updated_at=trip_order.updated_at,
    )


async def _batch_load_trip_order_outs(
    db: AsyncSession, trip_orders: list[TripOrder]
) -> list[TripOrderOut]:
    """Batch-load matched work order IDs and containers for multiple trip orders."""
    if not trip_orders:
        return []

    to_ids = [to.id for to in trip_orders]
    matched_mapping = await _batch_get_matched_work_order_ids(db, to_ids)
    containers_mapping = await _batch_get_trip_containers(db, to_ids)

    return [
        TripOrderOut(
            id=to.id,
            trip_date=to.trip_date,
            client_id=to.client_id,
            client_name=to.client_name,
            work_type=to.work_type,
            route=to.route,
            pickup_location=to.pickup_location,
            dropoff_location=to.dropoff_location,
            tractor_plate=to.tractor_plate,
            driver_id=to.driver_id,
            driver_name=to.driver_name,
            container_number=to.container_number,
            containers=containers_mapping.get(to.id, []),
            pricing_id=to.pricing_id,
            unit_price=to.unit_price,
            driver_salary=to.driver_salary,
            allowance=to.allowance,
            revenue=to.revenue,
            status=to.status,
            is_confirmed=to.is_confirmed,
            confirmed_by=to.confirmed_by,
            confirmed_at=to.confirmed_at,
            is_locked=getattr(to, 'is_locked', False),
            locked_at=getattr(to, 'locked_at', None),
            locked_by=getattr(to, 'locked_by', None),
            matched_work_order_ids=matched_mapping.get(to.id, []),
            created_at=to.created_at,
            updated_at=to.updated_at,
        )
        for to in trip_orders
    ]


async def _set_work_orders_matched(db: AsyncSession, work_order_ids: list[int]) -> None:
    """Set status = MATCHED on each referenced work order."""
    for wo_id in work_order_ids:
        result = await db.execute(select(WorkOrder).where(WorkOrder.id == wo_id))
        wo = result.scalar_one_or_none()
        if wo is not None:
            wo.status = "MATCHED"


async def _update_client_debt(db: AsyncSession, client_id: int, amount: int) -> None:
    """Update client's outstanding debt by adding the amount."""
    if amount <= 0:
        return
    result = await db.execute(select(Client).where(Client.id == client_id))
    client = result.scalar_one_or_none()
    if client is not None:
        client.outstanding_debt += amount
        _logger.info(
            "CLIENT_DEBT_UPDATED",
            f"Client #{client_id}: debt increased by {amount}, new debt: {client.outstanding_debt}",
            "trip_orders",
        )


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
    request: Request,
    current_user: User = Depends(require_roles("accountant", "director", "superadmin")),
    db: AsyncSession = Depends(get_db),
):
    matched_ids = body.matched_work_order_ids
    trip_data = body.model_dump(exclude={"matched_work_order_ids", "containers"})

    # Validate container rules
    if body.containers:
        validate_same_work_type(body.containers)
        work_type_val = body.containers[0].work_type
        validate_container_quantity(work_type_val, len(body.containers))

    # Derive legacy fields from first container
    if body.containers:
        trip_data["container_number"] = body.containers[0].container_number
        trip_data["work_type"] = body.containers[0].work_type

    # Auto-lookup pricing from bang gia
    work_type = trip_data.get("work_type")
    if body.containers and work_type:
        from app.services.pricing_service import find_tiered_pricing
        # Count containers of same work_type for tiered pricing
        container_count = sum(1 for c in body.containers if c.work_type == work_type) or 1
        tiered = await find_tiered_pricing(
            db,
            client_id=body.client_id,
            work_type=work_type,
            quantity=container_count,
            route=body.route,
            pickup_location=body.pickup_location,
            dropoff_location=body.dropoff_location,
        )
        if tiered:
            trip_data["unit_price"] = tiered.unit_price
            trip_data["driver_salary"] = tiered.driver_salary
            trip_data["allowance"] = tiered.allowance
            trip_data["pricing_id"] = tiered.pricing.id
    # else: use values provided in body (or defaults)

    # Determine initial status based on whether all required fields are provided
    # Required fields: containers, client_id, route, pricing (unit_price > 0)
    has_containers = bool(body.containers)
    has_pricing = trip_data.get("unit_price", 0) > 0 and trip_data.get("driver_salary", 0) > 0

    if has_containers and has_pricing:
        trip_data["status"] = "PENDING"  # All info provided, ready for matching
    else:
        trip_data["status"] = "DRAFT"    # Missing info

    trip_order = TripOrder(**trip_data)
    db.add(trip_order)
    await db.flush()

    # Generate human-readable code (e.g. ABC0001)
    from app.services.code_service import generate_trip_order_code
    trip_order.code = await generate_trip_order_code(db, body.client_id)

    for c in body.containers:
        db.add(TripOrderContainer(
            trip_order_id=trip_order.id,
            container_number=c.container_number,
            work_type=c.work_type,
        ))

    for wo_id in matched_ids:
        db.add(TripOrderWorkOrder(
            trip_order_id=trip_order.id,
            work_order_id=wo_id,
        ))

    if matched_ids:
        await _set_work_orders_matched(db, matched_ids)

    await db.commit()
    await db.refresh(trip_order)

    if trip_order.driver_id:
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
    request: Request,
    current_user: User = Depends(require_roles("accountant", "director", "superadmin")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(TripOrder).where(TripOrder.id == trip_order_id)
    )
    trip_order = result.scalar_one_or_none()
    if trip_order is None:
        raise HTTPException(status_code=404, detail="Trip order not found")

    if getattr(trip_order, 'is_locked', False):
        raise HTTPException(status_code=403, detail="Trip order is locked. Unmatch first to edit.")
    if trip_order.is_confirmed:
        raise HTTPException(status_code=403, detail="Trip order is confirmed and cannot be edited.")

    update_data = body.model_dump(exclude_unset=True)
    new_matched_ids = update_data.pop("matched_work_order_ids", None)
    new_containers = update_data.pop("containers", None)

    for field, value in update_data.items():
        setattr(trip_order, field, value)

    # If salary/allowance changed, enqueue earning sync for linked WOs
    if "driver_salary" in update_data or "allowance" in update_data:
        await enqueue("sync_wo_earning_on_to_update", trip_order_id=trip_order.id)

    if new_containers is not None:
        await db.execute(
            delete(TripOrderContainer).where(
                TripOrderContainer.trip_order_id == trip_order.id
            )
        )
        for c_data in new_containers:
            db.add(TripOrderContainer(
                trip_order_id=trip_order.id,
                container_number=c_data["container_number"],
                work_type=c_data["work_type"],
            ))
        if new_containers:
            trip_order.container_number = new_containers[0]["container_number"]
            trip_order.work_type = new_containers[0]["work_type"]

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

        # If TO has pricing and now has matched work orders, update client debt
        # This simulates "invoicing" when the trip is completed
        if trip_order.unit_price > 0 and len(new_matched_ids) > 0:
            await _update_client_debt(db, trip_order.client_id, trip_order.unit_price)

    await db.commit()
    await db.refresh(trip_order)

    # Enqueue salary recalculation if matched work orders changed
    if new_matched_ids:
        ref_date = trip_order.trip_date if hasattr(trip_order, "trip_date") and trip_order.trip_date else date.today()
        await _enqueue_salary_recalc(db, trip_order.driver_id, ref_date)

    return await _load_trip_order_out(db, trip_order)


@router.put("/trip-orders/{trip_order_id}/cancel", response_model=TripOrderOut)
async def cancel_trip_order(
    trip_order_id: int,
    body: CancelRequest,
    request: Request,
    current_user: User = Depends(require_roles("accountant", "director", "superadmin")),
    db: AsyncSession = Depends(get_db),
):
    """Cancel a trip order (only DRAFT or PENDING/unmatched can be cancelled). Reason required."""
    result = await db.execute(
        select(TripOrder).where(TripOrder.id == trip_order_id)
    )
    trip_order = result.scalar_one_or_none()
    if trip_order is None:
        raise HTTPException(status_code=404, detail="Trip order not found")

    if getattr(trip_order, 'is_locked', False):
        raise HTTPException(status_code=403, detail="Cannot cancel a matched trip order. Unmatch first.")

    if trip_order.status == "DRAFT":
        trip_order.status = "CANCELLED"
    elif trip_order.status == "PENDING":
        trip_order.status = "CANCELLED"
    elif trip_order.status in ("COMPLETED", "CANCELLED"):
        raise HTTPException(status_code=400, detail=f"Cannot cancel trip order with status {trip_order.status}")
    else:
        raise HTTPException(status_code=400, detail=f"Invalid status for cancellation: {trip_order.status}")

    set_audit_reason(body.reason)

    await db.commit()
    await db.refresh(trip_order)

    return await _load_trip_order_out(db, trip_order)


@router.put("/trip-orders/{trip_order_id}/confirm", response_model=TripOrderOut)
async def toggle_trip_order_confirmation(
    trip_order_id: int,
    request: Request,
    current_user: User = Depends(require_roles("accountant", "director", "superadmin")),
    db: AsyncSession = Depends(get_db),
):
    """Toggle is_confirmed status for a trip order. Confirms and sets linked WOs to COMPLETED."""
    result = await db.execute(
        select(TripOrder).where(TripOrder.id == trip_order_id)
    )
    trip_order = result.scalar_one_or_none()
    if trip_order is None:
        raise HTTPException(status_code=404, detail="Trip order not found")

    trip_order.is_confirmed = not trip_order.is_confirmed

    if trip_order.is_confirmed:
        trip_order.confirmed_by = current_user.id
        trip_order.confirmed_at = datetime.now(timezone.utc)

        # Set linked WOs to COMPLETED
        matched_wo_ids = await _get_matched_work_order_ids(db, trip_order.id)
        for wo_id in matched_wo_ids:
            wo_result = await db.execute(select(WorkOrder).where(WorkOrder.id == wo_id))
            wo = wo_result.scalar_one_or_none()
            if wo:
                wo.status = "COMPLETED"

        _logger.info("TripOrder #%d confirmed by user #%d", trip_order_id, current_user.id)
    else:
        trip_order.confirmed_by = None
        trip_order.confirmed_at = None
        _logger.info("TripOrder #%d unconfirmed by user #%d", trip_order_id, current_user.id)

    await db.commit()
    await db.refresh(trip_order)

    return await _load_trip_order_out(db, trip_order)


@router.get("/trip-orders/template")
async def download_trip_order_template(
    current_user: User = Depends(require_roles("accountant", "superadmin")),
):
    """Download blank Excel template for trip order import."""
    from app.services.excel_service import generate_trip_order_template

    content = generate_trip_order_template()
    return StreamingResponse(
        io.BytesIO(content),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=trip_order_template.xlsx"},
    )


@router.post("/trip-orders/import", status_code=200)
async def import_trip_orders_excel(
    file: UploadFile = File(...),
    current_user: User = Depends(require_roles("accountant", "superadmin")),
    db: AsyncSession = Depends(get_db),
):
    """Import trip orders from Excel file."""
    from app.services.excel_service import parse_trip_order_excel, import_trip_orders

    content = await file.read()
    rows = await parse_trip_order_excel(content)
    if not rows:
        raise HTTPException(status_code=400, detail="File Excel trống hoặc không đúng định dạng")

    result = await import_trip_orders(db, rows, current_user.id)
    return result


@router.get("/trip-orders/export")
async def export_trip_orders_excel(
    date_from: date | None = None,
    date_to: date | None = None,
    status: str | None = None,
    current_user: User = Depends(require_roles("accountant", "superadmin")),
    db: AsyncSession = Depends(get_db),
):
    """Export trip orders to Excel."""
    from app.services.excel_service import generate_trip_orders_excel

    content = await generate_trip_orders_excel(
        db, date_from=date_from.isoformat() if date_from else None,
        date_to=date_to.isoformat() if date_to else None, status=status,
    )
    return StreamingResponse(
        io.BytesIO(content),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=trip_orders.xlsx"},
    )
