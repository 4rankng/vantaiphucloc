"""Domain aggregates for the Customer & Pricing context.

Pure Python -- no SQLAlchemy / Pydantic. Business rules live as methods
on the aggregates; mappers translate to/from ORM rows.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone

from app.contexts.customer_pricing.domain.value_objects import (
    GeocodeSource,
    LocationAliasId,
    LocationId,
    Money,
    PartnerId,
    WorkType,
    normalize_work_type,
)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


# -- Partner (unified client + vendor) aggregate --------------------


@dataclass
class Partner:
    """Partner aggregate root.

    Replaces the former Client and Vendor entities. A single partner can
    act as client or vendor. `partner_type` discriminates:
    ``client`` | ``vendor`` | ``both``.
    """

    id: PartnerId | None
    name: str
    partner_type: str          # "client" | "vendor"
    code: str | None = None
    phone: str | None = None
    tax_code: str | None = None
    address: str | None = None
    contact_person: str | None = None
    is_active: bool = True
    created_at: datetime = field(default_factory=_utcnow)
    updated_at: datetime = field(default_factory=_utcnow)

    def deactivate(self) -> None:
        self.is_active = False
        self.updated_at = _utcnow()

    def reactivate(self) -> None:
        self.is_active = True
        self.updated_at = _utcnow()


# -- Location aggregate (with aliases) ------------------------------


@dataclass
class LocationAlias:
    """Alternative name for a Location. Primary name is locations.name."""

    id: LocationAliasId | None
    location_id: LocationId
    alias: str
    alias_normalized: str
    source: str                # "import" | "manual" | "fuzzy_match"
    created_at: datetime = field(default_factory=_utcnow)
    created_by_id: int | None = None


@dataclass
class Location:
    """Location aggregate root.

    Aliases belong to the aggregate and are loaded together. GPS coords
    may be null at creation time and are backfilled by `record_gps_pin`
    or by a future geocoder.
    """

    id: LocationId | None
    name: str
    is_active: bool = True
    lat: float | None = None
    lng: float | None = None
    geocoded_at: datetime | None = None
    geocode_source: GeocodeSource | None = None
    pending_geocode: bool = True
    created_via: str | None = None
    created_by_id: int | None = None
    location_review_needed: bool = False
    created_at: datetime = field(default_factory=_utcnow)
    updated_at: datetime = field(default_factory=_utcnow)
    aliases: list[LocationAlias] = field(default_factory=list)

    # -- invariants --------------------

    def has_coords(self) -> bool:
        return self.lat is not None and self.lng is not None

    # -- behaviour ---------------------

    def record_gps_pin(
        self,
        *,
        lat: float,
        lng: float,
        source: GeocodeSource = "driver_pin",
        review_needed: bool = True,
    ) -> None:
        self.lat = lat
        self.lng = lng
        self.geocoded_at = _utcnow()
        self.geocode_source = source
        self.pending_geocode = False
        self.location_review_needed = review_needed
        self.updated_at = _utcnow()

    def add_alias(self, alias: str, alias_normalized: str, source: str,
                  *, created_by_id: int | None = None) -> LocationAlias:
        # Idempotent: alias_normalized is unique inside the aggregate.
        for existing in self.aliases:
            if existing.alias_normalized == alias_normalized:
                return existing
        if self.id is None:
            raise ValueError("cannot add alias to an unsaved Location")
        new = LocationAlias(
            id=None,
            location_id=self.id,
            alias=alias,
            alias_normalized=alias_normalized,
            source=source,
            created_by_id=created_by_id,
        )
        self.aliases.append(new)
        self.updated_at = _utcnow()
        return new

    def deactivate(self) -> None:
        self.is_active = False
        self.updated_at = _utcnow()

    def merge_into(self, *, target: "Location", user_id: int) -> None:
        if self.id is None or target.id is None:
            raise ValueError("cannot merge unsaved locations")
        if self.id == target.id:
            raise ValueError("cannot merge a location into itself")
        self.is_active = False
        self.updated_at = _utcnow()


