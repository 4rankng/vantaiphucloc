"""Domain exceptions for the Route Pricing context."""

from __future__ import annotations


class RoutePricingError(Exception):
    """Base exception for the context."""


class NotFound(RoutePricingError):
    def __init__(self, ident: object) -> None:
        super().__init__(f"RoutePricing not found: {ident!r}")
        self.ident = ident


class AlreadyExists(RoutePricingError):
    def __init__(self, key: object) -> None:
        super().__init__(f"RoutePricing already exists: {key!r}")
        self.key = key


class NoPriceSet(RoutePricingError):
    def __init__(self) -> None:
        super().__init__("At least one container price must be set")
