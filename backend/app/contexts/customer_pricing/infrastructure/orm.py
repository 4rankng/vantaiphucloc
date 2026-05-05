"""SQLAlchemy ORM for the Customer & Pricing context.

Re-exports the existing Base-mapped classes under XxxORM aliases. The
single physical definition lives in `app.models.domain` while other
contexts still import from there directly; once those contexts are
themselves extracted, the definitions migrate here.
"""

from __future__ import annotations

from app.models.domain import (
    Client as ClientORM,
    Location as LocationORM,
    LocationAlias as LocationAliasORM,
    Pricing as PricingORM,
    PricingLine as PricingLineORM,
    Route as RouteORM,
    Vendor as VendorORM,
)

__all__ = [
    "ClientORM",
    "LocationORM",
    "LocationAliasORM",
    "PricingORM",
    "PricingLineORM",
    "RouteORM",
    "VendorORM",
]
