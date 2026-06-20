"""Pricing lookup helpers -- read-only.

Used by Operations (delivered-trip / booked-trip creation, bulk apply-pricing,
imports) to auto-fill ``unit_price`` and ``driver_salary`` from the matching
RoutePricing row. Lookup is FK-only -- callers can pass
``pickup_location_id``/``dropoff_location_id`` directly, or pass name strings
and we resolve them via the ``locations`` table.

Talks to ORM models directly -- Operations consumers pass their existing
``AsyncSession``.
"""

from __future__ import annotations

import hashlib

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.contexts.customer_pricing.infrastructure.orm import LocationORM
from app.models.domain import RoutePricing as RoutePricingORM
from app.core.cache import CacheManager


_CONT_TYPE_PRICE_MAP = {
    "F20": "f20_price",
    "F40": "f40_price",
    "E20": "e20_price",
    "E40": "e40_price",
}

_CONT_TYPE_SALARY_MAP = {
    "F20": "f20_driver_salary",
    "F40": "f40_driver_salary",
    "E20": "e20_driver_salary",
    "E40": "e40_driver_salary",
}

_DEFAULT_CONT_TYPE = "F20"


def _pricing_cache_key(
    client_id: int,
    work_type: str,
    pickup_location_id: int,
    dropoff_location_id: int,
) -> str:
    raw = f"{client_id}:{work_type}:{pickup_location_id}:{dropoff_location_id}"
    return hashlib.sha256(raw.encode()).hexdigest()[:16]


async def _resolve_location_id(db: AsyncSession, name: str | None) -> int | None:
    if not name:
        return None
    res = await db.execute(
        select(LocationORM.id).where(
            LocationORM.name == name,
            LocationORM.is_active == True,  # noqa: E712
        )
    )
    return res.scalar_one_or_none()


async def _exact_pricing_query(
    db: AsyncSession,
    client_id: int,
    work_type: str,
    pickup_location_id: int,
    dropoff_location_id: int,
) -> RoutePricingORM | None:
    res = await db.execute(
        select(RoutePricingORM)
        .where(
            RoutePricingORM.client_id == client_id,
            RoutePricingORM.work_type == work_type,
            RoutePricingORM.pickup_location_id == pickup_location_id,
            RoutePricingORM.dropoff_location_id == dropoff_location_id,
            RoutePricingORM.is_active == True,  # noqa: E712
        )
        .limit(1)
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
) -> RoutePricingORM | None:
    """Find the RoutePricing row matching client + work_type + lane.

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
        client_id,
        work_type,
        pickup_location_id,
        dropoff_location_id,
    )
    if cache:
        cached = await cache.get_json("pricing_lookup", cache_key)
        if cached is not None:
            res = await db.execute(
                select(RoutePricingORM)
                .where(RoutePricingORM.id == cached["id"])
                .limit(1)
            )
            return res.scalar_one_or_none()

    pricing = await _exact_pricing_query(
        db,
        client_id,
        work_type,
        pickup_location_id,
        dropoff_location_id,
    )

    if pricing and cache:
        await cache.set_json("pricing_lookup", cache_key, {"id": pricing.id}, ttl=600)
    return pricing


class TieredPricing:
    """Financial values resolved from a RoutePricing row for a given container type."""

    def __init__(self, pricing: RoutePricingORM, cont_type: str | None = None):
        self.pricing = pricing
        ct = cont_type or _DEFAULT_CONT_TYPE
        price_col = _CONT_TYPE_PRICE_MAP.get(ct, "f20_price")
        salary_col = _CONT_TYPE_SALARY_MAP.get(ct, "f20_driver_salary")
        self.unit_price = getattr(pricing, price_col) or 0
        self.driver_salary = getattr(pricing, salary_col) or 0

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
    cont_type: str | None = None,
    cache: CacheManager | None = None,
) -> TieredPricing | None:
    """Find route pricing + return the price for the given container type.

    The ``quantity`` parameter is accepted for backward compatibility but is
    no longer used -- the new route_pricings table uses flat container-type
    columns instead of quantity tiers.
    """
    pricing = await find_pricing(
        db,
        client_id,
        work_type,
        pickup_location_id=pickup_location_id,
        dropoff_location_id=dropoff_location_id,
        pickup_location=pickup_location,
        dropoff_location=dropoff_location,
        cache=cache,
    )
    if pricing is None:
        return None

    return TieredPricing(pricing, cont_type)
