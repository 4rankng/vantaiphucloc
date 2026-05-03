"""
Pricing lookup service.

Used by work order and trip order creation to auto-fill unit_price, driver_salary,
allowance, and earning from a matching Pricing record + PricingLine.
"""

import hashlib

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.domain import Pricing, PricingLine, Location
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
    # Resolve location FKs for FK-based lookup
    pickup_loc_id = None
    dropoff_loc_id = None
    if pickup_location:
        loc_result = await db.execute(
            select(Location).where(Location.name == pickup_location, Location.is_active == True)
        )
        loc = loc_result.scalar_one_or_none()
        if loc:
            pickup_loc_id = loc.id
    if dropoff_location:
        loc_result = await db.execute(
            select(Location).where(Location.name == dropoff_location, Location.is_active == True)
        )
        loc = loc_result.scalar_one_or_none()
        if loc:
            dropoff_loc_id = loc.id

    # Try FK-based pickup/dropoff match first
    if pickup_loc_id and dropoff_loc_id:
        result = await db.execute(
            select(Pricing).where(
                Pricing.client_id == client_id,
                Pricing.work_type == work_type,
                Pricing.pickup_location_id == pickup_loc_id,
                Pricing.dropoff_location_id == dropoff_loc_id,
                Pricing.is_active == True,
            ).limit(1)
        )
        pricing = result.scalar_one_or_none()
        if pricing:
            return pricing

    # Try string-based pickup/dropoff match
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
                Pricing.is_active == True,
            ).limit(1)
        )
        pricing = result.scalar_one_or_none()

        if pricing and cache:
            await cache.set_json("pricing_lookup", cache_key, {"id": pricing.id}, ttl=600)

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
                Pricing.is_active == True,
            ).limit(1)
        )
        pricing = result.scalar_one_or_none()

        if pricing and cache:
            await cache.set_json("pricing_lookup", cache_key, {"id": pricing.id}, ttl=600)

        return pricing

    return None


class TieredPricing:
    """Financial values resolved from a PricingLine for a given quantity."""

    def __init__(self, pricing: Pricing, line: PricingLine):
        self.pricing = pricing
        self.unit_price = line.unit_price
        self.driver_salary = line.driver_salary
        self.allowance = line.allowance

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

    Looks up the Pricing header, then finds the PricingLine matching the
    requested quantity. Returns None if no pricing or no matching line exists.
    """
    pricing = await find_pricing(
        db, client_id, work_type, route=route,
        pickup_location=pickup_location, dropoff_location=dropoff_location,
        cache=cache,
    )
    if pricing is None:
        return None

    # Exact quantity match first, then fall back to quantity=1
    result = await db.execute(
        select(PricingLine).where(
            PricingLine.pricing_id == pricing.id,
            PricingLine.quantity == quantity,
        ).limit(1)
    )
    line = result.scalar_one_or_none()

    if line is None and quantity != 1:
        result = await db.execute(
            select(PricingLine).where(
                PricingLine.pricing_id == pricing.id,
                PricingLine.quantity == 1,
            ).limit(1)
        )
        line = result.scalar_one_or_none()

    if line is None:
        return None

    return TieredPricing(pricing, line)
