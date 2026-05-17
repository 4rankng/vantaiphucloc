"""Domain exceptions for the Customer & Pricing context.

Translation to HTTP responses lives in `interface/error_translation.py`.
"""

from __future__ import annotations


class CustomerPricingError(Exception):
    """Base exception for the context."""


class NotFound(CustomerPricingError):
    """Aggregate not found."""

    def __init__(self, kind: str, ident: object) -> None:
        super().__init__(f"{kind} not found: {ident!r}")
        self.kind = kind
        self.ident = ident


class AlreadyExists(CustomerPricingError):
    """Uniqueness violation."""

    def __init__(self, kind: str, key: object) -> None:
        super().__init__(f"{kind} already exists: {key!r}")
        self.kind = kind
        self.key = key


class LocationInUse(CustomerPricingError):
    """Tried to delete a location that is referenced elsewhere."""

    def __init__(self, table: str, column: str) -> None:
        super().__init__(f"location is referenced in {table}.{column}")
        self.table = table
        self.column = column


class PricingNotMatched(CustomerPricingError):
    """No pricing rule matches the (client, work_type, lane, qty) tuple."""
