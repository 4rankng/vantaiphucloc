"""Value objects for the Customer & Pricing context."""

from __future__ import annotations

from typing import NewType


ClientId = NewType("ClientId", int)
LocationId = NewType("LocationId", int)
PricingId = NewType("PricingId", int)
RouteId = NewType("RouteId", int)
VendorId = NewType("VendorId", int)
LocationAliasId = NewType("LocationAliasId", int)
PricingLineId = NewType("PricingLineId", int)


# Container work types — see BizLogic.md §2.
# E20/E40 = empty 20/40-foot, F20/F40 = full 20/40-foot.
WorkType = str  # constrained to {"E20", "E40", "F20", "F40"} at use sites.

# Provenance tag for how a Location's GPS coords arrived.
# Known values: "manual", "driver_pin", "geocoder", "alias_match".
GeocodeSource = str

# VND amounts. We carry plain ints — the schema uses Integer columns.
Money = int


_VALID_WORK_TYPES = frozenset({"E20", "E40", "F20", "F40"})


def normalize_work_type(value: str | None) -> str:
    """Uppercase + validate. Raises ValueError on unknown work_type."""
    if value is None:
        raise ValueError("work_type is required")
    norm = value.strip().upper()
    if norm not in _VALID_WORK_TYPES:
        raise ValueError(
            f"unknown work_type {value!r} (expected one of {sorted(_VALID_WORK_TYPES)})"
        )
    return norm


def normalize_client_type(value: str) -> str:
    """clients.type ∈ {company, individual}."""
    norm = (value or "").strip().lower()
    if norm not in {"company", "individual"}:
        raise ValueError(
            f"invalid client type {value!r} (expected 'company' or 'individual')"
        )
    return norm
