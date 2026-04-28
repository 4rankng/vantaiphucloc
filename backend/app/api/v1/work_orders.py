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
    containers_data = body.containers

    # Use the first container's work_type for pricing lookup
    first_container = containers_data[0] if containers_data else None
    work_type = first_container.work_type if first_container else ""

    pricing = await find_pricing(
        db,
        company_id=current_user.company_id,
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
        company_id=current_user.company_id,
        client_id=body.client_id,
        client_name=body.client_name,
        route=body.route,
        driver_id=body.driver_id,
        driver_name=body.driver_name,
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
    await db.flush()  # get work_order.id without committing

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

    await db.commit()
    await db.refresh(work_order)

    # Enqueue geocoding tasks
    try:
        from app.workers import enqueue
        if body.gps_lat and body.gps_lng:
            await enqueue("geocode_work_order_task", work_order_id=work_order.id, lat=body.gps_lat, lng=body.gps_lng)
        for container in containers_data:
            if container.photo_lat and container.photo_lng:
                result = await db.execute(
                    select(WorkOrderContainer).where(
                        WorkOrderContainer.work_order_id == work_order.id,
                        WorkOrderContainer.container_number == container.container_number,
                    )
                )
                c = result.scalar_one_or_none()
                if c:
                    await enqueue("geocode_container_task", container_id=c.id, lat=container.photo_lat, lng=container.photo_lng)
    except RuntimeError:
        _logger.warning("Failed to enqueue geocoding for WO#%s", work_order.id)

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
    query = select(WorkOrder).where(WorkOrder.company_id == current_user.company_id)

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
        select(WorkOrder).where(
            WorkOrder.id == work_order_id,
            WorkOrder.company_id == current_user.company_id,
        )
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
        select(WorkOrder).where(
            WorkOrder.id == work_order_id,
            WorkOrder.company_id == current_user.company_id,
        )
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
