import logging

from sqlalchemy import select

from app.database import get_session
from app.models.domain import DeliveredTrip, DeliveredTripContainer
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
        result = await db.execute(select(DeliveredTripContainer).where(DeliveredTripContainer.id == container_id))
        container = result.scalar_one_or_none()
        if container:
            container.photo_address = address
            await db.commit()

    return {"container_id": container_id, "status": "geocoded" if address != "Không xác định" else "fallback", "address": address}


async def geocode_delivered_trip_task(ctx: dict, delivered_trip_id: int, lat: float, lng: float) -> dict:
    redis = ctx["redis"]
    address = await reverse_geocode(redis, lat, lng)
    # Fallback to coords string; if coords are null-ish, use "Không xác định"
    if not address:
        if lat and lng:
            address = f"{lat}, {lng}"
        else:
            address = "Không xác định"

    async with get_session() as db:
        result = await db.execute(select(DeliveredTrip).where(DeliveredTrip.id == delivered_trip_id))
        wo = result.scalar_one_or_none()
        if wo:
            wo.gps_address = address
            await db.commit()

    return {"delivered_trip_id": delivered_trip_id, "status": "geocoded" if address != "Không xác định" else "fallback", "address": address}
