"""
Pricing lookup service.

Used by work order and trip order creation to auto-fill unit_price, driver_salary,
allowance, and earning from a matching Pricing record + PricingLine.

Lookup is FK-only (after the schema overhaul that dropped denormalized
string columns from `pricings`). Callers can pass either an explicit
`pickup_location_id`/`dropoff_location_id` pair or a name+resolver to
turn strings into IDs.
"""

import hashlib

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.domain import Pricing, PricingLine, Location
from app.core.cache import CacheManager


def _pricing_cache_key(
    client_id: int, work_type: str,
    pickup_location_id: int, dropoff_location_id: int,
) -> str:
    raw = f"{client_id}:{work_type}:{pickup_location_id}:{dropoff_location_id}"
    return hashlib.sha256(raw.encode()).hexdigest()[:16]


async def _resolve_location_id(db: AsyncSession, name: str | None) -> int | None:
    if not name:
        return None
    res = await db.execute(
        select(Location.id).where(Location.name == name, Location.is_active == True)
    )
    return res.scalar_one_or_none()


async def find_pricing(
    db: AsyncSession,
    client_id: int,
    work_type: str,
    pickup_location_id: int | None = None,
    dropoff_location_id: int | None = None,
    pickup_location: str | None = None,    # convenience: resolve name → id
    dropoff_location: str | None = None,   # convenience: resolve name → id
    cache: CacheManager | None = None,
    # `route` kept for callers that still pass it; ignored.
    route: str | None = None,
) -> Pricing | None:
    """Find the Pricing row for `(client_id, work_type, pickup, dropoff)`.

    `pickup_location_id`/`dropoff_location_id` are preferred. If only
    name strings are passed, this resolves them to IDs via the
    `locations` table (active rows only).
    """
    if pickup_location_id is None:
        pickup_location_id = await _resolve_location_id(db, pickup_location)
    if dropoff_location_id is None:
        dropoff_location_id = await _resolve_location_id(db, dropoff_location)
    if pickup_location_id is None or dropoff_location_id is None:
        return None

    cache_key = _pricing_cache_key(client_id, work_type, pickup_location_id, dropoff_location_id)
    if cache:
        cached = await cache.get_json("pricing_lookup", cache_key)
        if cached is not None:
            res = await db.execute(
                select(Pricing).where(Pricing.id == cached["id"]).limit(1)
            )
            return res.scalar_one_or_none()

    res = await db.execute(
        select(Pricing).where(
            Pricing.client_id == client_id,
            Pricing.work_type == work_type,
            Pricing.pickup_location_id == pickup_location_id,
            Pricing.dropoff_location_id == dropoff_location_id,
            Pricing.is_active == True,
        ).limit(1)
    )
    pricing = res.scalar_one_or_none()
    if pricing and cache:
        await cache.set_json("pricing_lookup", cache_key, {"id": pricing.id}, ttl=600)
    return pricing


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
    pickup_location_id: int | None = None,
    dropoff_location_id: int | None = None,
    pickup_location: str | None = None,
    dropoff_location: str | None = None,
    cache: CacheManager | None = None,
    route: str | None = None,
) -> TieredPricing | None:
    """Find pricing + the matching PricingLine for the requested quantity.

    Falls back to `quantity=1` when the exact tier isn't defined.
    """
    pricing = await find_pricing(
        db, client_id, work_type,
        pickup_location_id=pickup_location_id,
        dropoff_location_id=dropoff_location_id,
        pickup_location=pickup_location,
        dropoff_location=dropoff_location,
        cache=cache,
    )
    if pricing is None:
        return None

    res = await db.execute(
        select(PricingLine).where(
            PricingLine.pricing_id == pricing.id,
            PricingLine.quantity == quantity,
        ).limit(1)
    )
    line = res.scalar_one_or_none()
    if line is None and quantity != 1:
        res = await db.execute(
            select(PricingLine).where(
                PricingLine.pricing_id == pricing.id,
                PricingLine.quantity == 1,
            ).limit(1)
        )
        line = res.scalar_one_or_none()
    if line is None:
        return None

    return TieredPricing(pricing, line)
