import io
import math
import logging
from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy import select, delete, func

from app.models.base import User
from app.models.domain import TripOrder, TripOrderContainer, TripOrderWorkOrder, WorkOrder
from app.models.enums import TripOrderStatus, WorkOrderStatus
from app.schemas.base import PaginatedResponse
from app.schemas.domain import TripOrderCreate, TripOrderUpdate, TripOrderOut, TripContainerOut, CancelRequest
from app.core.deps import get_current_user, require_permission
from app.services.salary_service import get_salary_period_dates
from app.core.audit_context import set_audit_reason
from app.workers import enqueue
from app.validators.container import validate_container_quantity, validate_same_work_type
from app.repositories.client_repo import ClientRepository
from app.repositories.trip_order_repo import TripOrderRepository
from app.repositories.work_order_repo import WorkOrderRepository
from app.repositories.deps import get_trip_order_repo, get_client_repo, get_work_order_repo
from app.utils.iso6346 import normalize_container_number as _norm

_logger = logging.getLogger(__name__)

router = APIRouter()


# ---------------------------------------------------------------------------
# Schema mapping helpers
# ---------------------------------------------------------------------------

def _to_schema(
    to: TripOrder,
    containers: list[TripOrderContainer],
    matched_ids: list[int],
) -> TripOrderOut:
    return TripOrderOut(
        id=to.id,
        trip_date=to.trip_date,
        client_id=to.client_id,
        client_name=to.client_name,
        code=to.code,
        work_type=to.work_type,
        route=to.route,
        pickup_location=to.pickup_location,
        dropoff_location=to.dropoff_location,
        container_number=to.container_number,
        containers=[TripContainerOut.model_validate(c) for c in containers],
        pricing_id=to.pricing_id,
        unit_price=to.unit_price,
        driver_salary=to.driver_salary,
        allowance=to.allowance,
        revenue=to.revenue,
        status=to.status,
        is_confirmed=to.is_confirmed,
        confirmed_by=to.confirmed_by,
        confirmed_at=to.confirmed_at,
        is_locked=to.is_locked,
        locked_at=to.locked_at,
        locked_by=to.locked_by,
        matched_work_order_ids=matched_ids,
        created_at=to.created_at,
        updated_at=to.updated_at,
    )


async def _load_one(repo: TripOrderRepository, trip_order: TripOrder) -> TripOrderOut:
    matched_ids = await repo.get_matched_work_order_ids(trip_order.id)
    containers = await repo.get_containers(trip_order.id)
    return _to_schema(trip_order, containers, matched_ids)


async def _load_many(
    repo: TripOrderRepository, trip_orders: list[TripOrder]
) -> list[TripOrderOut]:
    if not trip_orders:
        return []
    ids = [to.id for to in trip_orders]
    containers_by_id = await repo.batch_load_containers(ids)
    matched_by_id = await repo.batch_load_matched_ids(ids)
    return [
        _to_schema(to, containers_by_id.get(to.id, []), matched_by_id.get(to.id, []))
        for to in trip_orders
    ]


async def _enqueue_salary_recalc(session, driver_id: int, ref_date: date) -> None:
    try:
        from app.workers import enqueue, salary_recalc_job_id
        start, end = await get_salary_period_dates(session, ref_date)
        job_id = salary_recalc_job_id(driver_id, start.isoformat(), end.isoformat())
        await enqueue(
            "calculate_salary_task",
            _job_id=job_id,
            driver_id=driver_id,
            start_date=start.isoformat(),
            end_date=end.isoformat(),
        )
    except Exception:
        _logger.warning("Failed to enqueue salary recalculation for driver %s", driver_id)


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

# Aliases used by reconcile.py
_load_trip_order_out = _load_one


@router.post("/trip-orders", response_model=TripOrderOut, status_code=201)
async def create_trip_order(
    body: TripOrderCreate,
    request: Request,
    current_user: User = Depends(require_permission("read", "TripOrder")),
    repo: TripOrderRepository = Depends(get_trip_order_repo),
    wo_repo: WorkOrderRepository = Depends(get_work_order_repo),
):
    db = repo.session
    matched_ids = body.matched_work_order_ids
    trip_data = body.model_dump(exclude={"matched_work_order_ids", "containers"})

    if body.containers:
        validate_same_work_type(body.containers)
        work_type_val = body.containers[0].work_type
        validate_container_quantity(work_type_val, len(body.containers))
        trip_data["container_number"] = _norm(body.containers[0].container_number)
        trip_data["work_type"] = work_type_val

    work_type = trip_data.get("work_type")
    if body.containers and work_type:
        from app.services.pricing_service import find_tiered_pricing
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

    if not trip_data.get("pricing_id"):
        trip_data["pricing_id"] = None

    has_containers = bool(body.containers)
    has_pricing = trip_data.get("unit_price", 0) > 0 and trip_data.get("driver_salary", 0) > 0
    trip_data["status"] = TripOrderStatus.PENDING if (has_containers and has_pricing) else TripOrderStatus.DRAFT

    trip_order = TripOrder(**trip_data)
    db.add(trip_order)
    await db.flush()

    from app.services.code_service import generate_trip_order_code
    trip_order.code = await generate_trip_order_code(db, body.client_id)

    for c in body.containers:
        db.add(TripOrderContainer(
            trip_order_id=trip_order.id,
            container_number=_norm(c.container_number),
            work_type=c.work_type,
        ))

    for wo_id in matched_ids:
        db.add(TripOrderWorkOrder(trip_order_id=trip_order.id, work_order_id=wo_id))

    if matched_ids:
        await wo_repo.set_status_bulk(matched_ids, WorkOrderStatus.MATCHED)

    await db.commit()
    await db.refresh(trip_order)
    return await _load_one(repo, trip_order)


@router.get("/trip-orders", response_model=PaginatedResponse[TripOrderOut])
async def list_trip_orders(
    client_id: int | None = None,
    status: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    current_user: User = Depends(require_permission("read", "TripOrder")),
    repo: TripOrderRepository = Depends(get_trip_order_repo),
):
    db = repo.session
    query = select(TripOrder)
    count_query = select(func.count(TripOrder.id))

    filters = []
    if client_id is not None:
        filters.append(TripOrder.client_id == client_id)
    if status is not None:
        filters.append(TripOrder.status == status)
    if date_from is not None:
        filters.append(TripOrder.trip_date >= date_from)
    if date_to is not None:
        filters.append(TripOrder.trip_date <= date_to)

    for f in filters:
        query = query.where(f)
        count_query = count_query.where(f)

    total = (await db.execute(count_query)).scalar() or 0
    rows = list(
        (
            await db.execute(
                query.order_by(TripOrder.id.desc())
                .offset((page - 1) * page_size)
                .limit(page_size)
            )
        ).scalars().all()
    )

    items = await _load_many(repo, rows)

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
    current_user: User = Depends(require_permission("read", "TripOrder")),
    repo: TripOrderRepository = Depends(get_trip_order_repo),
):
    trip_order = await repo.get_by_id_or_404(trip_order_id)
    return await _load_one(repo, trip_order)


@router.put("/trip-orders/{trip_order_id}", response_model=TripOrderOut)
async def update_trip_order(
    trip_order_id: int,
    body: TripOrderUpdate,
    request: Request,
    current_user: User = Depends(require_permission("read", "TripOrder")),
    repo: TripOrderRepository = Depends(get_trip_order_repo),
    wo_repo: WorkOrderRepository = Depends(get_work_order_repo),
    client_repo: ClientRepository = Depends(get_client_repo),
):
    db = repo.session
    trip_order = await repo.get_by_id_or_404(trip_order_id)

    if trip_order.is_locked:
        raise HTTPException(status_code=403, detail="Trip order is locked. Unmatch first to edit.")
    if trip_order.is_confirmed:
        raise HTTPException(status_code=403, detail="Trip order is confirmed and cannot be edited.")

    update_data = body.model_dump(exclude_unset=True)
    new_matched_ids = update_data.pop("matched_work_order_ids", None)
    new_containers = update_data.pop("containers", None)

    await repo.update(trip_order, **update_data)

    if "driver_salary" in update_data or "allowance" in update_data:
        await enqueue("sync_wo_earning_on_to_update", trip_order_id=trip_order.id)

    if new_containers is not None:
        await db.execute(
            delete(TripOrderContainer).where(TripOrderContainer.trip_order_id == trip_order.id)
        )
        for c_data in new_containers:
            db.add(TripOrderContainer(
                trip_order_id=trip_order.id,
                container_number=_norm(c_data["container_number"]),
                work_type=c_data["work_type"],
            ))
        if new_containers:
            trip_order.container_number = _norm(new_containers[0]["container_number"])
            trip_order.work_type = new_containers[0]["work_type"]

    if new_matched_ids is not None:
        existing_ids = await repo.get_matched_work_order_ids(trip_order.id)
        removed_ids = set(existing_ids) - set(new_matched_ids)
        for wo_id in removed_ids:
            await db.execute(
                delete(TripOrderWorkOrder).where(
                    TripOrderWorkOrder.trip_order_id == trip_order.id,
                    TripOrderWorkOrder.work_order_id == wo_id,
                )
            )
        for wo_id in new_matched_ids:
            if wo_id not in existing_ids:
                db.add(TripOrderWorkOrder(trip_order_id=trip_order.id, work_order_id=wo_id))
        await wo_repo.set_status_bulk(new_matched_ids, WorkOrderStatus.MATCHED)

        if trip_order.unit_price > 0 and len(new_matched_ids) > 0:
            await client_repo.increment_debt(trip_order.client_id, trip_order.unit_price)

    await db.commit()
    await db.refresh(trip_order)
    return await _load_one(repo, trip_order)


@router.put("/trip-orders/{trip_order_id}/cancel", response_model=TripOrderOut)
async def cancel_trip_order(
    trip_order_id: int,
    body: CancelRequest,
    request: Request,
    current_user: User = Depends(require_permission("read", "TripOrder")),
    repo: TripOrderRepository = Depends(get_trip_order_repo),
):
    trip_order = await repo.get_by_id_or_404(trip_order_id)

    if trip_order.is_locked:
        raise HTTPException(status_code=403, detail="Cannot cancel a matched trip order. Unmatch first.")
    if trip_order.status not in (TripOrderStatus.DRAFT, TripOrderStatus.PENDING):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot cancel trip order with status {trip_order.status}",
        )

    trip_order.status = TripOrderStatus.CANCELLED
    set_audit_reason(body.reason)

    await repo.session.commit()
    await repo.session.refresh(trip_order)
    return await _load_one(repo, trip_order)


@router.put("/trip-orders/{trip_order_id}/confirm", response_model=TripOrderOut)
async def toggle_trip_order_confirmation(
    trip_order_id: int,
    request: Request,
    current_user: User = Depends(require_permission("read", "TripOrder")),
    repo: TripOrderRepository = Depends(get_trip_order_repo),
    wo_repo: WorkOrderRepository = Depends(get_work_order_repo),
):
    db = repo.session
    trip_order = await repo.get_by_id_or_404(trip_order_id)

    trip_order.is_confirmed = not trip_order.is_confirmed

    if trip_order.is_confirmed:
        trip_order.confirmed_by = current_user.id
        trip_order.confirmed_at = datetime.now(timezone.utc)
        matched_ids = await repo.get_matched_work_order_ids(trip_order.id)
        await wo_repo.set_status_bulk(matched_ids, WorkOrderStatus.COMPLETED)
        _logger.info("TripOrder #%d confirmed by user #%d", trip_order_id, current_user.id)
    else:
        trip_order.confirmed_by = None
        trip_order.confirmed_at = None
        _logger.info("TripOrder #%d unconfirmed by user #%d", trip_order_id, current_user.id)

    await db.commit()
    await db.refresh(trip_order)
    return await _load_one(repo, trip_order)


@router.get("/trip-orders/template")
async def download_trip_order_template(
    current_user: User = Depends(require_permission("create", "TripOrder")),
):
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
    current_user: User = Depends(require_permission("create", "TripOrder")),
    repo: TripOrderRepository = Depends(get_trip_order_repo),
):
    from app.services.excel_service import parse_trip_order_excel, import_trip_orders
    content = await file.read()
    rows = await parse_trip_order_excel(content)
    if not rows:
        raise HTTPException(status_code=400, detail="File Excel trống hoặc không đúng định dạng")
    return await import_trip_orders(repo.session, rows, current_user.id)


@router.get("/trip-orders/export")
async def export_trip_orders_excel(
    date_from: date | None = None,
    date_to: date | None = None,
    status: str | None = None,
    current_user: User = Depends(require_permission("create", "TripOrder")),
    repo: TripOrderRepository = Depends(get_trip_order_repo),
):
    from app.services.excel_service import generate_trip_orders_excel
    content = await generate_trip_orders_excel(
        repo.session,
        date_from=date_from.isoformat() if date_from else None,
        date_to=date_to.isoformat() if date_to else None,
        status=status,
    )
    return StreamingResponse(
        io.BytesIO(content),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=trip_orders.xlsx"},
    )
