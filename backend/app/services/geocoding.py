import logging

import httpx

logger = logging.getLogger(__name__)

NOMINATIM_URL = "https://nominatim.openstreetmap.org/reverse"
CACHE_TTL_SECONDS = 30 * 24 * 60 * 60  # 30 days


async def reverse_geocode(redis, lat: float, lng: float) -> str | None:
    rounded_lat = round(lat, 4)
    rounded_lng = round(lng, 4)
    cache_key = f"geocode:{rounded_lat}:{rounded_lng}"

    try:
        cached = await redis.get(cache_key)
        if cached:
            return cached.decode() if isinstance(cached, bytes) else cached
    except Exception:
        pass

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                NOMINATIM_URL,
                params={"lat": str(lat), "lon": str(lng), "format": "json", "accept-language": "vi"},
                headers={"User-Agent": "VantaiPhucLoc/1.0"},
                timeout=10.0,
            )
            resp.raise_for_status()
            address = resp.json().get("display_name")
    except Exception:
        logger.warning("Nominatim reverse-geocode failed for %.4f,%.4f", lat, lng, exc_info=True)
        return None

    if not address:
        return None

    try:
        await redis.setex(cache_key, CACHE_TTL_SECONDS, address)
    except Exception:
        pass

    return address
