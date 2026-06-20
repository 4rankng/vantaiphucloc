"""ORM <-> domain entity mappers for the Vendor Route Pricing context."""

from __future__ import annotations

from app.contexts.vendor_route_pricing.domain.entities import VendorRoutePricing
from app.contexts.vendor_route_pricing.domain.value_objects import (
    LocationId,
    VendorId,
    VendorRoutePricingId,
)
from app.contexts.vendor_route_pricing.infrastructure.orm import VendorRoutePricingORM


def vendor_route_pricing_to_domain(orm: VendorRoutePricingORM) -> VendorRoutePricing:
    return VendorRoutePricing(
        id=VendorRoutePricingId(orm.id) if orm.id is not None else None,
        vendor_id=VendorId(orm.vendor_id),
        pickup_location_id=LocationId(orm.pickup_location_id),
        dropoff_location_id=LocationId(orm.dropoff_location_id),
        work_type=orm.work_type,
        f20_price=orm.f20_price,
        f40_price=orm.f40_price,
        e20_price=orm.e20_price,
        e40_price=orm.e40_price,
        is_active=bool(orm.is_active),
        created_at=orm.created_at,
        updated_at=orm.updated_at,
    )


def vendor_route_pricing_to_orm(
    rp: VendorRoutePricing, orm: VendorRoutePricingORM | None = None
) -> VendorRoutePricingORM:
    if orm is None:
        orm = VendorRoutePricingORM()
    if rp.id is not None:
        orm.id = int(rp.id)
    orm.vendor_id = int(rp.vendor_id)
    orm.pickup_location_id = int(rp.pickup_location_id)
    orm.dropoff_location_id = int(rp.dropoff_location_id)
    orm.work_type = rp.work_type
    orm.f20_price = rp.f20_price
    orm.f40_price = rp.f40_price
    orm.e20_price = rp.e20_price
    orm.e40_price = rp.e40_price
    orm.is_active = rp.is_active
    return orm
