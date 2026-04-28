import logging

from sqlalchemy import select

from app.database import async_session
from app.models.domain import WorkOrder, WorkOrderContainer
from app.services.geocoding import reverse_geocode

logger = logging.getLogger(__name__)


async def geocode_container_task(ctx: dict, container_id: int, lat: float, lng: float) -> dict:
    redis = ctx["redis"]
    address = await reverse_geocode(redis, lat, lng)
    if not address:
        return {"container_id": container_id, "status": "geocode_failed"}

    async with async_session() as db:
        result = await db.execute(select(WorkOrderContainer).where(WorkOrderContainer.id == container_id))
        container = result.scalar_one_or_none()
        if container:
            container.photo_address = address
            await db.commit()

    return {"container_id": container_id, "status": "geocoded", "address": address}


async def geocode_work_order_task(ctx: dict, work_order_id: int, lat: float, lng: float) -> dict:
    redis = ctx["redis"]
    address = await reverse_geocode(redis, lat, lng)
    if not address:
        return {"work_order_id": work_order_id, "status": "geocode_failed"}

    async with async_session() as db:
        result = await db.execute(select(WorkOrder).where(WorkOrder.id == work_order_id))
        wo = result.scalar_one_or_none()
        if wo:
            wo.gps_address = address
            await db.commit()

    return {"work_order_id": work_order_id, "status": "geocoded", "address": address}
