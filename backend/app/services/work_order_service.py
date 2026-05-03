"""Business logic for WorkOrder creation and status transitions."""

import asyncio
import logging

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.base import User
from app.models.domain import Client, Location, WorkOrder, WorkOrderContainer
from app.models.enums import WorkOrderStatus
from app.schemas.domain import WorkOrderCreate
from app.services.code_service import generate_work_order_code
from app.services.photo_storage import save_base64_photo
from app.services.pricing_service import find_pricing
from app.utils.iso6346 import normalize_container_number, validate_container_number

_logger = logging.getLogger(__name__)


async def create_work_order(
    body: WorkOrderCreate,
    current_user: User,
    db: AsyncSession,
) -> WorkOrder:
    """Create a WorkOrder and its containers. Does NOT commit — caller owns the transaction."""
    for container in body.containers:
        valid, error = validate_container_number(container.container_number)
        if not valid:
            raise HTTPException(
                status_code=422,
                detail=f"Số container không hợp lệ: {container.container_number} — {error}",
            )

    first_container = body.containers[0] if body.containers else None
    work_type = first_container.work_type if first_container else ""

    driver_id = current_user.id if current_user.role == "driver" else body.driver_id
    driver_name = current_user.username if current_user.role == "driver" else body.driver_name

    pricing = await find_pricing(
        db,
        client_id=body.client_id,
        work_type=work_type,
        route=body.route,
        pickup_location=body.pickup_location,
        dropoff_location=body.dropoff_location,
    )

    client_result = await db.execute(select(Client.code).where(Client.id == body.client_id))
    client_code = client_result.scalar_one_or_none()

    gps_address = None if (body.gps_lat and body.gps_lng) else "Không xác định"

    pickup_location_id = await _resolve_location_id(db, body.pickup_location)
    dropoff_location_id = await _resolve_location_id(db, body.dropoff_location)

    work_order = WorkOrder(
        client_id=body.client_id,
        client_name=body.client_name,
        client_code=client_code,
        route=body.route,
        pickup_location=body.pickup_location,
        dropoff_location=body.dropoff_location,
        pickup_location_id=pickup_location_id,
        dropoff_location_id=dropoff_location_id,
        driver_id=driver_id,
        driver_name=driver_name,
        tractor_plate=body.tractor_plate,
        gps_lat=body.gps_lat,
        gps_lng=body.gps_lng,
        gps_address=gps_address,
        unit_price=0,
        driver_salary=0,
        allowance=0,
        earning=0,
        pricing_id=pricing.id if pricing else None,
        status=WorkOrderStatus.PENDING,
    )
    db.add(work_order)
    await db.flush()

    work_order.code = await generate_work_order_code(db, body.client_id)

    for container in body.containers:
        photo_url = container.photo_url
        if photo_url and photo_url.startswith("data:"):
            photo_url = await asyncio.to_thread(save_base64_photo, photo_url)
        db.add(WorkOrderContainer(
            work_order_id=work_order.id,
            container_number=normalize_container_number(container.container_number),
            work_type=container.work_type,
            photo_url=photo_url,
            photo_lat=container.photo_lat,
            photo_lng=container.photo_lng,
            photo_timestamp=container.photo_timestamp,
        ))

    await db.flush()
    return work_order


async def _resolve_location_id(db: AsyncSession, name: str | None) -> int | None:
    if not name:
        return None
    result = await db.execute(
        select(Location).where(Location.name == name, Location.is_active == True)  # noqa: E712
    )
    loc = result.scalar_one_or_none()
    return loc.id if loc else None
