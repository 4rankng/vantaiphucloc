"""SQLAlchemy ORM for the Customer & Pricing context.

Re-exports the existing Base-mapped classes under XxxORM aliases.
"""

from __future__ import annotations

from app.models.domain import (
    Location as LocationORM,
    LocationAlias as LocationAliasORM,
    Partner as PartnerORM,
    Pricing as PricingORM,
    PricingLine as PricingLineORM,
)

__all__ = [
    "LocationORM",
    "LocationAliasORM",
    "PartnerORM",
    "PricingORM",
    "PricingLineORM",
]
