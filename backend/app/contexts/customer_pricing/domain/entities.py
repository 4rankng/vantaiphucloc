"""Domain aggregates for the Customer & Pricing context.

Pure Python -- no SQLAlchemy / Pydantic. Business rules live as methods
on the aggregates; mappers translate to/from ORM rows.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone

from app.contexts.customer_pricing.domain.exceptions import (
    InvalidAliasTransition,
    PricingNotMatched,
)
from app.contexts.customer_pricing.domain.value_objects import (
    GeocodeSource,
    LocationAliasId,
    LocationId,
    Money,
    PartnerId,
    PricingId,
    PricingLineId,
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
    act as client, vendor, or both. `partner_type` discriminates:
    ``client`` | ``vendor`` | ``both``.
    """

    id: PartnerId | None
    name: str
    partner_type: str          # "client" | "vendor" | "both"
    partner_role: str | None = None   # "shipping_line" | "factory" | "transport" | "other"
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
    """Inside the Location aggregate. FSM: PENDING -> CONFIRMED | REJECTED | MERGED."""

    id: LocationAliasId | None
    location_id: LocationId
    alias: str
    alias_normalized: str
    source: str                # "import" | "manual" | "fuzzy_match"
    status: str = "PENDING"
    confirmed_by_id: int | None = None
    confirmed_at: datetime | None = None
    rejected_by_id: int | None = None
    rejected_at: datetime | None = None
    merge_target_location_id: int | None = None
    note: str | None = None
    created_at: datetime = field(default_factory=_utcnow)
    created_by_id: int | None = None

    # -- FSM transitions ----------------

    def confirm(self, *, user_id: int) -> None:
        if self.status != "PENDING":
            raise InvalidAliasTransition(self.id, self.status, "CONFIRMED")
        self.status = "CONFIRMED"
        self.confirmed_by_id = user_id
        self.confirmed_at = _utcnow()

    def reject(self, *, user_id: int, note: str | None = None) -> None:
        if self.status not in ("PENDING", "CONFIRMED"):
            raise InvalidAliasTransition(self.id, self.status, "REJECTED")
        self.status = "REJECTED"
        self.rejected_by_id = user_id
        self.rejected_at = _utcnow()
        self.note = note

    def reopen(self, *, user_id: int) -> None:
        if self.status != "REJECTED":
            raise InvalidAliasTransition(self.id, self.status, "PENDING")
        self.status = "PENDING"
        self.rejected_by_id = None
        self.rejected_at = None
        self.note = None

    def mark_merged(self, *, target_location_id: int, user_id: int) -> None:
        if self.status != "PENDING":
            raise InvalidAliasTransition(self.id, self.status, "MERGED")
        self.status = "MERGED"
        self.merge_target_location_id = target_location_id
        self.confirmed_by_id = user_id
        self.confirmed_at = _utcnow()


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
        for alias in self.aliases:
            if alias.status == "MERGED":
                continue
            alias.mark_merged(
                target_location_id=int(target.id),
                user_id=user_id,
            )


# -- Pricing aggregate (with PricingLines) -------------------------


@dataclass
class PricingLine:
    """Quantity-tier inside a Pricing aggregate.

    The accountant defines tiers like "1 cont = 2,000,000 / 2 conts =
    3,500,000 / >=3 = 4,800,000". We store each tier as its own row keyed
    by the integer `quantity`.
    """

    id: PricingLineId | None
    pricing_id: PricingId | None    # None until parent is saved
    quantity: int
    unit_price: Money = 0
    driver_salary: Money = 0
    allowance: Money = 0


@dataclass
class Pricing:
    """Pricing aggregate root.

    One row per (partner, work_type, lane). Quantity tiers are inside
    the aggregate and modified together with the parent.
    """

    id: PricingId | None
    partner_id: PartnerId
    work_type: WorkType
    pickup_location_id: LocationId
    dropoff_location_id: LocationId
    is_active: bool = True
    created_at: datetime = field(default_factory=_utcnow)
    updated_at: datetime = field(default_factory=_utcnow)
    lines: list[PricingLine] = field(default_factory=list)

    def __post_init__(self) -> None:
        self.work_type = normalize_work_type(self.work_type)

    # -- tier lookup -------------------

    def line_for_quantity(self, quantity: int) -> PricingLine:
        """Find the matching tier for `quantity` containers.

        Matching: the highest tier whose `quantity` is <= the requested
        count (e.g. 3 conts -> tier 3 if exists, else tier 2, else tier 1).
        Raises PricingNotMatched if no tier matches (i.e. requested qty
        is below the smallest defined tier).
        """
        candidates = [ln for ln in self.lines if ln.quantity <= quantity]
        if not candidates:
            raise PricingNotMatched(
                f"no pricing tier <= {quantity} on pricing {self.id!r}"
            )
        return max(candidates, key=lambda ln: ln.quantity)

    def upsert_line(
        self,
        *,
        quantity: int,
        unit_price: Money,
        driver_salary: Money = 0,
        allowance: Money = 0,
    ) -> PricingLine:
        """Add or update the tier for `quantity`."""
        for ln in self.lines:
            if ln.quantity == quantity:
                ln.unit_price = int(unit_price)
                ln.driver_salary = int(driver_salary)
                ln.allowance = int(allowance)
                self.updated_at = _utcnow()
                return ln
        new = PricingLine(
            id=None,
            pricing_id=self.id,
            quantity=int(quantity),
            unit_price=int(unit_price),
            driver_salary=int(driver_salary),
            allowance=int(allowance),
        )
        self.lines.append(new)
        self.updated_at = _utcnow()
        return new

    def deactivate(self) -> None:
        self.is_active = False
        self.updated_at = _utcnow()
