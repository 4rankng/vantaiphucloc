from datetime import date
import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from app.database import get_db
from app.models.base import User
from app.models.domain import WorkOrder, WorkOrderContainer
from app.schemas.domain import (
    WorkOrderCreate,
    WorkOrderUpdate,
    WorkOrderOut,
    ContainerOut,
    BatchWorkOrderCreate,
    BatchWorkOrderResult,
)
from app.core.deps import get_current_user, require_roles
from app.services.pricing_service import find_pricing

_logger = logging.getLogger(__name__)

router = APIRouter()


async def _load_work_order_out(db: AsyncSession, work_order: WorkOrder) -> WorkOrderOut:
    """Load a WorkOrder with its associated WorkOrderContainer rows and return a WorkOrderOut."""
    containers_result = await db.execute(
        select(WorkOrderContainer).where(
            WorkOrderContainer.work_order_id == work_order.id
        )
    )
    containers = containers_result.scalars().all()
    return WorkOrderOut(
        id=work_order.id,
        client_id=work_order.client_id,
        client_name=work_order.client_name,
        route=work_order.route,
        driver_id=work_order.driver_id,
        driver_name=work_order.driver_name,
        tractor_plate=work_order.tractor_plate,
        gps_lat=work_order.gps_lat,
        gps_lng=work_order.gps_lng,
        gps_address=work_order.gps_address,
        unit_price=work_order.unit_price,
        driver_salary=work_order.driver_salary,
        allowance=work_order.allowance,
        earning=work_order.earning,
        pricing_id=work_order.pricing_id,
        status=work_order.status,
        created_at=work_order.created_at,
        updated_at=work_order.updated_at,
        containers=[ContainerOut.model_validate(c) for c in containers],
    )


@router.post("/work-orders", response_model=WorkOrderOut, status_code=201)
async def create_work_order(
    body: WorkOrderCreate,
    current_user: User = Depends(require_roles("driver")),
    db: AsyncSession = Depends(get_db),
):
    work_order = await _create_work_order_db(body, current_user, db)
    await db.commit()
    await db.refresh(work_order)

    # Fire-and-forget notification
    try:
        from app.workers import enqueue
        await enqueue(
            "send_notification_task",
            user_id=current_user.id,
            title="Phiếu làm việc mới",
            message=f"WO#{work_order.id} đã được tạo bởi tài xế {work_order.driver_name}",
            channel="in_app",
        )
    except RuntimeError:
        _logger.warning("Failed to enqueue notification for WO#%s", work_order.id)

    # Enqueue geocoding tasks (best-effort)
    try:
        from app.workers import enqueue
        if body.gps_lat and body.gps_lng:
            await enqueue("geocode_work_order_task", work_order_id=work_order.id, lat=body.gps_lat, lng=body.gps_lng)
    except RuntimeError:
        pass

    return await _load_work_order_out(db, work_order)


@router.get("/work-orders", response_model=list[WorkOrderOut])
async def list_work_orders(
    driver_id: int | None = None,
    tractor_plate: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    status: str | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(WorkOrder)

    if driver_id is not None:
        query = query.where(WorkOrder.driver_id == driver_id)
    if tractor_plate is not None:
        query = query.where(WorkOrder.tractor_plate == tractor_plate)
    if date_from is not None:
        query = query.where(WorkOrder.created_at >= date_from)
    if date_to is not None:
        query = query.where(WorkOrder.created_at <= date_to)
    if status is not None:
        query = query.where(WorkOrder.status == status)

    result = await db.execute(query.order_by(WorkOrder.id.desc()))
    work_orders = result.scalars().all()

    return [await _load_work_order_out(db, wo) for wo in work_orders]


@router.get("/work-orders/{work_order_id}", response_model=WorkOrderOut)
async def get_work_order(
    work_order_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(WorkOrder).where(WorkOrder.id == work_order_id)
    )
    work_order = result.scalar_one_or_none()
    if work_order is None:
        raise HTTPException(status_code=404, detail="Work order not found")

    return await _load_work_order_out(db, work_order)


@router.put("/work-orders/{work_order_id}", response_model=WorkOrderOut)
async def update_work_order(
    work_order_id: int,
    body: WorkOrderUpdate,
    current_user: User = Depends(require_roles("accountant", "superadmin")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(WorkOrder).where(WorkOrder.id == work_order_id)
    )
    work_order = result.scalar_one_or_none()
    if work_order is None:
        raise HTTPException(status_code=404, detail="Work order not found")

    update_data = body.model_dump(exclude_unset=True)
    new_containers = update_data.pop("containers", None)

    for field, value in update_data.items():
        setattr(work_order, field, value)

    if new_containers is not None:
        await db.execute(
            delete(WorkOrderContainer).where(
                WorkOrderContainer.work_order_id == work_order.id
            )
        )
        for container in new_containers:
            db.add(WorkOrderContainer(
                work_order_id=work_order.id,
                container_number=container["container_number"],
                work_type=container["work_type"],
                photo_url=container.get("photo_url"),
            ))

    await db.commit()
    await db.refresh(work_order)

    return await _load_work_order_out(db, work_order)


@router.post("/work-orders/batch", status_code=207)
async def batch_create_work_orders(
    body: BatchWorkOrderCreate,
    current_user: User = Depends(require_roles("driver")),
    db: AsyncSession = Depends(get_db),
):
    results: list[BatchWorkOrderResult] = []
    async with db.begin():
        for i, item in enumerate(body.items):
            async with db.begin_nested():
                try:
                    wo = await _create_work_order_db(item, current_user, db)
                    results.append(BatchWorkOrderResult(index=i, id=wo.id, success=True))
                except Exception as exc:
                    _logger.warning("Batch item %d failed: %s", i, exc)
                    results.append(BatchWorkOrderResult(index=i, success=False, error=str(exc)))

    # Enqueue geocoding for successful items (best-effort, outside transaction)
    try:
        from app.workers import enqueue
        for r in results:
            if r.success and r.id and body.items[r.index].gps_lat and body.items[r.index].gps_lng:
                await enqueue(
                    "geocode_work_order_task",
                    work_order_id=r.id,
                    lat=body.items[r.index].gps_lat,
                    lng=body.items[r.index].gps_lng,
                )
    except RuntimeError:
        pass

    return results


async def _create_work_order_db(
    body: WorkOrderCreate, current_user: User, db: AsyncSession
) -> WorkOrder:
    """Create WorkOrder + containers in the DB. Flushes but does NOT commit
    — the caller is responsible for committing (or letting the context manager do it)."""
    containers_data = body.containers

    first_container = containers_data[0] if containers_data else None
    work_type = first_container.work_type if first_container else ""

    # Drivers always create work orders under their own identity
    driver_id = current_user.id if current_user.role == "driver" else body.driver_id
    driver_name = current_user.username if current_user.role == "driver" else body.driver_name

    pricing = await find_pricing(
        db,
        client_id=body.client_id,
        work_type=work_type,
        route=body.route,
    )

    if pricing is not None:
        unit_price = pricing.unit_price
        driver_salary = pricing.driver_salary
        allowance = pricing.allowance
        earning = driver_salary + allowance
        status = "PRICED"
        pricing_id = pricing.id
    else:
        unit_price = 0
        driver_salary = 0
        allowance = 0
        earning = 0
        status = "PENDING"
        pricing_id = None

    work_order = WorkOrder(
        client_id=body.client_id,
        client_name=body.client_name,
        route=body.route,
        driver_id=driver_id,
        driver_name=driver_name,
        tractor_plate=body.tractor_plate,
        gps_lat=body.gps_lat,
        gps_lng=body.gps_lng,
        gps_address=None,
        unit_price=unit_price,
        driver_salary=driver_salary,
        allowance=allowance,
        earning=earning,
        pricing_id=pricing_id,
        status=status,
    )
    db.add(work_order)
    await db.flush()

    for container in containers_data:
        db.add(WorkOrderContainer(
            work_order_id=work_order.id,
            container_number=container.container_number,
            work_type=container.work_type,
            photo_url=container.photo_url,
            photo_lat=container.photo_lat,
            photo_lng=container.photo_lng,
            photo_timestamp=container.photo_timestamp,
        ))

    await db.flush()
    return work_order
