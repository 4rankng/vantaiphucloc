"""ORM <-> domain entity mappers for the Customer & Pricing context."""

from __future__ import annotations

from app.contexts.customer_pricing.domain.entities import (
    Location,
    LocationAlias,
    Partner,
)
from app.contexts.customer_pricing.domain.value_objects import (
    LocationAliasId,
    LocationId,
    PartnerId,
)
from app.contexts.customer_pricing.infrastructure.orm import (
    LocationAliasORM,
    LocationORM,
    ClientORM,
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
