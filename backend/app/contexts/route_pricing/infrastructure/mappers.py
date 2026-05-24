"""ORM <-> domain entity mappers for the Route Pricing context."""
from __future__ import annotations

from app.contexts.route_pricing.domain.entities import RoutePricing
from app.contexts.route_pricing.domain.value_objects import (
    LocationId,
    PartnerId,
    RoutePricingId,
)
from app.contexts.route_pricing.infrastructure.orm import RoutePricingORM


def route_pricing_to_domain(orm: RoutePricingORM) -> RoutePricing:
    return RoutePricing(
        id=RoutePricingId(orm.id) if orm.id is not None else None,
        client_id=PartnerId(orm.client_id),
        pickup_location_id=LocationId(orm.pickup_location_id),
        dropoff_location_id=LocationId(orm.dropoff_location_id),
        work_type=orm.work_type,
        f20_price=orm.f20_price,
        f40_price=orm.f40_price,
        e20_price=orm.e20_price,
        e40_price=orm.e40_price,
        f20_driver_salary=orm.f20_driver_salary,
        f40_driver_salary=orm.f40_driver_salary,
        e20_driver_salary=orm.e20_driver_salary,
        e40_driver_salary=orm.e40_driver_salary,
        is_active=bool(orm.is_active),
        created_at=orm.created_at,
        updated_at=orm.updated_at,
    )


def route_pricing_to_orm(
    rp: RoutePricing, orm: RoutePricingORM | None = None
) -> RoutePricingORM:
    if orm is None:
        orm = RoutePricingORM()
    if rp.id is not None:
        orm.id = int(rp.id)
    orm.client_id = int(rp.client_id)
    orm.pickup_location_id = int(rp.pickup_location_id)
    orm.dropoff_location_id = int(rp.dropoff_location_id)
    orm.work_type = rp.work_type
    orm.f20_price = rp.f20_price
    orm.f40_price = rp.f40_price
    orm.e20_price = rp.e20_price
    orm.e40_price = rp.e40_price
    orm.f20_driver_salary = rp.f20_driver_salary
    orm.f40_driver_salary = rp.f40_driver_salary
    orm.e20_driver_salary = rp.e20_driver_salary
    orm.e40_driver_salary = rp.e40_driver_salary
    orm.is_active = rp.is_active
    return orm
