"""
Pricing lookup service.

Used by work order creation to auto-fill unit_price, driver_salary,
allowance, and earning from a matching Pricing record.
"""

import hashlib
import json

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.domain import Pricing
from app.core.cache import CacheManager


def _pricing_cache_key(client_id: int, work_type: str, route: str) -> str:
    raw = f"{client_id}:{work_type}:{route}"
    return hashlib.sha256(raw.encode()).hexdigest()[:16]


async def find_pricing(
    db: AsyncSession,
    client_id: int,
    work_type: str,
    route: str,
    cache: CacheManager | None = None,
) -> Pricing | None:
    cache_key = _pricing_cache_key(client_id, work_type, route)

    if cache:
        cached = await cache.get_json("pricing_lookup", cache_key)
        if cached is not None:
            result = await db.execute(
                select(Pricing).where(Pricing.id == cached["id"]).limit(1)
            )
            return result.scalar_one_or_none()

    result = await db.execute(
        select(Pricing).where(
            Pricing.client_id == client_id,
            Pricing.work_type == work_type,
            Pricing.route == route,
        ).limit(1)
    )
    pricing = result.scalar_one_or_none()

    if pricing and cache:
        await cache.set_json(
            "pricing_lookup", cache_key,
            {"id": pricing.id},
            ttl=600,
        )

    return pricing
