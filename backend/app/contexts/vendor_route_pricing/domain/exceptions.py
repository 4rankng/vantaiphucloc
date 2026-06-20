"""Domain exceptions for the Vendor Route Pricing context."""

from __future__ import annotations


class VendorRoutePricingError(Exception):
    """Base exception for the context."""


class NotFound(VendorRoutePricingError):
    def __init__(self, ident: object) -> None:
        super().__init__(f"VendorRoutePricing not found: {ident!r}")
        self.ident = ident


class AlreadyExists(VendorRoutePricingError):
    def __init__(self, key: object) -> None:
        super().__init__(f"VendorRoutePricing already exists: {key!r}")
        self.key = key


class NoPriceSet(VendorRoutePricingError):
    def __init__(self) -> None:
        super().__init__("At least one container price must be set")
