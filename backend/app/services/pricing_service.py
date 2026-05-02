"""
Pricing lookup service.

Used by work order and trip order creation to auto-fill unit_price, driver_salary,
allowance, and earning from a matching Pricing record.
"""

import hashlib
import json

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.domain import Pricing, PricingLine
from app.core.cache import CacheManager


def _pricing_cache_key(
    client_id: int, work_type: str, route: str | None = None,
    pickup_location: str | None = None, dropoff_location: str | None = None,
) -> str:
    raw = f"{client_id}:{work_type}:{route}:{pickup_location}:{dropoff_location}"
    return hashlib.sha256(raw.encode()).hexdigest()[:16]


async def find_pricing(
    db: AsyncSession,
    client_id: int,
    work_type: str,
    route: str | None = None,
    pickup_location: str | None = None,
    dropoff_location: str | None = None,
    cache: CacheManager | None = None,
) -> Pricing | None:
    # Try pickup/dropoff match first
    if pickup_location and dropoff_location:
        cache_key = _pricing_cache_key(client_id, work_type, pickup_location=pickup_location, dropoff_location=dropoff_location)

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
                Pricing.pickup_location == pickup_location,
                Pricing.dropoff_location == dropoff_location,
            ).limit(1)
        )
        pricing = result.scalar_one_or_none()

        if pricing and cache:
            await cache.set_json(
                "pricing_lookup", cache_key,
                {"id": pricing.id},
                ttl=600,
            )

        if pricing is not None:
            return pricing

    # Fallback to route match
    if route:
        cache_key = _pricing_cache_key(client_id, work_type, route=route)

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

    return None


class TieredPricing:
    """Pricing result with tiered values applied from PricingLine."""

    def __init__(self, pricing: Pricing, line: PricingLine | None = None):
        self.pricing = pricing
        if line and line.unit_price > 0:
            self.unit_price = line.unit_price
            self.driver_salary = line.driver_salary
            self.allowance = line.allowance
        else:
            self.unit_price = pricing.unit_price
            self.driver_salary = pricing.driver_salary
            self.allowance = pricing.allowance

    @property
    def id(self) -> int:
        return self.pricing.id


async def find_tiered_pricing(
    db: AsyncSession,
    client_id: int,
    work_type: str,
    quantity: int = 1,
    route: str | None = None,
    pickup_location: str | None = None,
    dropoff_location: str | None = None,
    cache: CacheManager | None = None,
) -> TieredPricing | None:
    """Find pricing with tiered quantity-based rates.

    Looks up the base Pricing record, then finds the best matching
    PricingLine where quantity <= requested quantity. If a line is found
    with financial values, those override the base pricing.
    """
    pricing = await find_pricing(
        db, client_id, work_type, route=route,
        pickup_location=pickup_location, dropoff_location=dropoff_location,
        cache=cache,
    )
    if pricing is None:
        return None

    # Look for the highest applicable tier (quantity <= requested)
    result = await db.execute(
        select(PricingLine).where(
            PricingLine.pricing_id == pricing.id,
            PricingLine.work_type == work_type,
            PricingLine.quantity <= quantity,
        ).order_by(PricingLine.quantity.desc()).limit(1)
    )
    line = result.scalar_one_or_none()

    return TieredPricing(pricing, line)
