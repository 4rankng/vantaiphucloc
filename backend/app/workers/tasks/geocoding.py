import logging

from sqlalchemy import select

from app.database import get_session
from app.models.domain import WorkOrder, WorkOrderContainer
from app.contexts.operations.infrastructure.geocoding import reverse_geocode

logger = logging.getLogger(__name__)


async def geocode_container_task(ctx: dict, container_id: int, lat: float, lng: float) -> dict:
    redis = ctx["redis"]
    address = await reverse_geocode(redis, lat, lng)
    if not address:
        if lat and lng:
            address = f"{lat}, {lng}"
        else:
            address = "Không xác định"

    async with get_session() as db:
        result = await db.execute(select(WorkOrderContainer).where(WorkOrderContainer.id == container_id))
        container = result.scalar_one_or_none()
        if container:
            container.photo_address = address
            await db.commit()

    return {"container_id": container_id, "status": "geocoded" if address != "Không xác định" else "fallback", "address": address}


async def geocode_work_order_task(ctx: dict, work_order_id: int, lat: float, lng: float) -> dict:
    redis = ctx["redis"]
    address = await reverse_geocode(redis, lat, lng)
    # Fallback to coords string; if coords are null-ish, use "Không xác định"
    if not address:
        if lat and lng:
            address = f"{lat}, {lng}"
        else:
            address = "Không xác định"

    async with get_session() as db:
        result = await db.execute(select(WorkOrder).where(WorkOrder.id == work_order_id))
        wo = result.scalar_one_or_none()
        if wo:
            wo.gps_address = address
            await db.commit()

    return {"work_order_id": work_order_id, "status": "geocoded" if address != "Không xác định" else "fallback", "address": address}
