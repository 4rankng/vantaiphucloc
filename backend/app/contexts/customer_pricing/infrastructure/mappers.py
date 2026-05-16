"""ORM <-> domain entity mappers for the Customer & Pricing context."""

from __future__ import annotations

from app.contexts.customer_pricing.domain.entities import (
    Location,
    LocationAlias,
    Partner,
    Pricing,
    PricingLine,
)
from app.contexts.customer_pricing.domain.value_objects import (
    LocationAliasId,
    LocationId,
    PartnerId,
    PricingId,
    PricingLineId,
)
from app.contexts.customer_pricing.infrastructure.orm import (
    LocationAliasORM,
    LocationORM,
    ClientORM,
    PricingLineORM,
    PricingORM,
)


# -- Partner ---------------------------------------------------------


def client_to_domain(orm: ClientORM) -> "Partner":
    return Partner(
        id=PartnerId(orm.id) if orm.id is not None else None,
        name=orm.name,
        partner_type="client",
        code=orm.code,
        phone=orm.phone,
        tax_code=orm.tax_code,
        address=orm.address,
        contact_person=orm.contact_person,
        is_active=bool(orm.is_active),
        created_at=orm.created_at,
        updated_at=orm.updated_at,
    )


def client_to_orm(p: "Partner", orm: ClientORM | None = None) -> ClientORM:
    if orm is None:
        orm = ClientORM()
    if p.id is not None:
        orm.id = int(p.id)
    orm.name = p.name
    orm.code = p.code
    orm.phone = p.phone
    orm.tax_code = p.tax_code
    orm.address = p.address
    orm.contact_person = p.contact_person
    orm.is_active = p.is_active
    return orm


# -- Location (with aliases) -----------------------------------------


def alias_to_domain(orm: LocationAliasORM) -> LocationAlias:
    return LocationAlias(
        id=LocationAliasId(orm.id) if orm.id is not None else None,
        location_id=LocationId(orm.location_id),
        alias=orm.alias,
        alias_normalized=orm.alias_normalized,
        source=orm.source,
        status=orm.status or "PENDING",
        confirmed_by_id=orm.confirmed_by_id,
        confirmed_at=orm.confirmed_at,
        rejected_by_id=orm.rejected_by_id,
        rejected_at=orm.rejected_at,
        merge_target_location_id=orm.merge_target_location_id,
        note=orm.note,
        created_at=orm.created_at,
        created_by_id=orm.created_by_id,
    )


def alias_to_orm(a: LocationAlias, orm: LocationAliasORM | None = None) -> LocationAliasORM:
    if orm is None:
        orm = LocationAliasORM()
    if a.id is not None:
        orm.id = int(a.id)
    orm.location_id = int(a.location_id)
    orm.alias = a.alias
    orm.alias_normalized = a.alias_normalized
    orm.source = a.source
    orm.status = a.status
    orm.confirmed_by_id = a.confirmed_by_id
    orm.confirmed_at = a.confirmed_at
    orm.rejected_by_id = a.rejected_by_id
    orm.rejected_at = a.rejected_at
    orm.merge_target_location_id = a.merge_target_location_id
    orm.note = a.note
    orm.created_by_id = a.created_by_id
    return orm


def location_to_domain(orm: LocationORM, aliases: list[LocationAliasORM] | None = None) -> Location:
    return Location(
        id=LocationId(orm.id) if orm.id is not None else None,
        name=orm.name,
        is_active=bool(orm.is_active),
        lat=float(orm.lat) if orm.lat is not None else None,
        lng=float(orm.lng) if orm.lng is not None else None,
        geocoded_at=orm.geocoded_at,
        geocode_source=orm.geocode_source,
        pending_geocode=bool(orm.pending_geocode),
        created_via=orm.created_via,
        created_by_id=orm.created_by_id,
        location_review_needed=bool(orm.location_review_needed),
        created_at=orm.created_at,
        updated_at=orm.updated_at,
        aliases=[alias_to_domain(a) for a in (aliases or [])],
    )


def location_to_orm(loc: Location, orm: LocationORM | None = None) -> LocationORM:
    if orm is None:
        orm = LocationORM()
    if loc.id is not None:
        orm.id = int(loc.id)
    orm.name = loc.name
    orm.is_active = loc.is_active
    orm.lat = loc.lat
    orm.lng = loc.lng
    orm.geocoded_at = loc.geocoded_at
    orm.geocode_source = loc.geocode_source
    orm.pending_geocode = loc.pending_geocode
    orm.created_via = loc.created_via
    orm.created_by_id = loc.created_by_id
    orm.location_review_needed = loc.location_review_needed
    return orm


# -- Pricing (with lines) --------------------------------------------


def pricing_line_to_domain(orm: PricingLineORM) -> PricingLine:
    return PricingLine(
        id=PricingLineId(orm.id) if orm.id is not None else None,
        pricing_id=PricingId(orm.pricing_id) if orm.pricing_id is not None else None,
        quantity=int(orm.quantity),
        unit_price=int(orm.unit_price or 0),
        driver_salary=int(orm.driver_salary or 0),
        allowance=int(orm.allowance or 0),
    )


def pricing_line_to_orm(ln: PricingLine, orm: PricingLineORM | None = None) -> PricingLineORM:
    if orm is None:
        orm = PricingLineORM()
    if ln.id is not None:
        orm.id = int(ln.id)
    if ln.pricing_id is not None:
        orm.pricing_id = int(ln.pricing_id)
    orm.quantity = int(ln.quantity)
    orm.unit_price = int(ln.unit_price)
    orm.driver_salary = int(ln.driver_salary)
    orm.allowance = int(ln.allowance)
    return orm


def pricing_to_domain(orm: PricingORM, lines: list[PricingLineORM] | None = None) -> Pricing:
    return Pricing(
        id=PricingId(orm.id) if orm.id is not None else None,
        client_id=PartnerId(orm.client_id),
        work_type=orm.work_type,
        pickup_location_id=LocationId(orm.pickup_location_id),
        dropoff_location_id=LocationId(orm.dropoff_location_id),
        operation_type=orm.operation_type,
        is_active=bool(orm.is_active),
        created_at=orm.created_at,
        updated_at=orm.updated_at,
        lines=[pricing_line_to_domain(ln) for ln in (lines or [])],
    )


def pricing_to_orm(p: Pricing, orm: PricingORM | None = None) -> PricingORM:
    if orm is None:
        orm = PricingORM()
    if p.id is not None:
        orm.id = int(p.id)
    orm.client_id = int(p.client_id)
    orm.work_type = p.work_type
    orm.pickup_location_id = int(p.pickup_location_id)
    orm.dropoff_location_id = int(p.dropoff_location_id)
    orm.operation_type = p.operation_type
    orm.is_active = p.is_active
    return orm
