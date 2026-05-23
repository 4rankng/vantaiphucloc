import logging

from app.contexts.operations.infrastructure.geocoding import reverse_geocode

logger = logging.getLogger(__name__)


async def geocode_location_task(ctx: dict, location_id: int, lat: float, lng: float) -> dict:
    redis = ctx["redis"]
    address = await reverse_geocode(redis, lat, lng)
    if not address:
        if lat and lng:
            address = f"{lat}, {lng}"
        else:
            address = "Không xác định"

    from sqlalchemy import select
    from app.database import get_session
    from app.models.domain import Location

    async with get_session() as db:
        result = await db.execute(select(Location).where(Location.id == location_id))
        loc = result.scalar_one_or_none()
        if loc:
            loc.geocoded_at = __import__("datetime").datetime.now(__import__("datetime").timezone.utc)
            await db.commit()

    return {"location_id": location_id, "status": "geocoded" if address != "Không xác định" else "fallback", "address": address}
