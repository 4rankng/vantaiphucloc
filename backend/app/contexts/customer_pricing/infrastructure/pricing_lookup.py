"""Pricing lookup helpers -- read-only.

Used by Operations (delivered-trip / booked-trip creation, bulk apply-pricing,
imports) to auto-fill `unit_price` and `driver_salary` from the matching
Pricing + PricingLine. Lookup is FK-only -- callers can pass
`pickup_location_id`/`dropoff_location_id` directly, or pass name strings
and we resolve them via the `locations` table.

Talks to ORM models directly -- Operations consumers pass their existing
`AsyncSession`.
"""

from __future__ import annotations

import hashlib

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.contexts.customer_pricing.infrastructure.orm import (
    LocationORM,
    PricingLineORM,
    PricingORM,
)
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
        select(LocationORM.id).where(
            LocationORM.name == name, LocationORM.is_active == True  # noqa: E712
        )
    )
    return res.scalar_one_or_none()


async def _exact_pricing_query(
    db: AsyncSession,
    client_id: int,
    work_type: str,
    pickup_location_id: int,
    dropoff_location_id: int,
) -> PricingORM | None:
    res = await db.execute(
        select(PricingORM).where(
            PricingORM.client_id == client_id,
            PricingORM.work_type == work_type,
            PricingORM.pickup_location_id == pickup_location_id,
            PricingORM.dropoff_location_id == dropoff_location_id,
            PricingORM.is_active == True,  # noqa: E712
        ).limit(1)
    )
    return res.scalar_one_or_none()


async def find_pricing(
    db: AsyncSession,
    client_id: int,
    work_type: str,
    pickup_location_id: int | None = None,
    dropoff_location_id: int | None = None,
    pickup_location: str | None = None,
    dropoff_location: str | None = None,
    cache: CacheManager | None = None,
) -> PricingORM | None:
    """Find the Pricing row matching client + work_type + lane.

    ``pickup_location_id``/``dropoff_location_id`` are preferred. If only
    name strings are passed this resolves them via the ``locations`` table.
    """
    if pickup_location_id is None:
        pickup_location_id = await _resolve_location_id(db, pickup_location)
    if dropoff_location_id is None:
        dropoff_location_id = await _resolve_location_id(db, dropoff_location)
    if pickup_location_id is None or dropoff_location_id is None:
        return None

    cache_key = _pricing_cache_key(
        client_id, work_type, pickup_location_id, dropoff_location_id,
    )
    if cache:
        cached = await cache.get_json("pricing_lookup", cache_key)
        if cached is not None:
            res = await db.execute(
                select(PricingORM).where(PricingORM.id == cached["id"]).limit(1)
            )
            return res.scalar_one_or_none()

    pricing = await _exact_pricing_query(
        db, client_id, work_type, pickup_location_id, dropoff_location_id,
    )

    if pricing and cache:
        await cache.set_json(
            "pricing_lookup", cache_key, {"id": pricing.id}, ttl=600
        )
    return pricing


class TieredPricing:
    """Financial values resolved from a PricingLine for a given quantity."""

    def __init__(self, pricing: PricingORM, line: PricingLineORM):
        self.pricing = pricing
        self.unit_price = line.unit_price
        self.driver_salary = line.driver_salary

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
) -> TieredPricing | None:
    """Find pricing + the matching PricingLine for the requested quantity.

    Falls back to ``quantity=1`` when the exact tier isn't defined.
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
        select(PricingLineORM).where(
            PricingLineORM.pricing_id == pricing.id,
            PricingLineORM.quantity == quantity,
        ).limit(1)
    )
    line = res.scalar_one_or_none()
    if line is None and quantity != 1:
        res = await db.execute(
            select(PricingLineORM).where(
                PricingLineORM.pricing_id == pricing.id,
                PricingLineORM.quantity == 1,
            ).limit(1)
        )
        line = res.scalar_one_or_none()
    if line is None:
        return None

    return TieredPricing(pricing, line)
