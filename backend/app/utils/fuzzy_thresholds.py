"""Per-customer fuzzy matching thresholds.

Default thresholds are used unless a customer has a specific override.
Thresholds can be configured via environment variables or this config file.

Threshold values:
  - 0: exact match only (no fuzzy)
  - 1: allow 1-char typo
  - 2: allow 2-char typos (default)
"""

from __future__ import annotations

from dataclasses import dataclass


# Default thresholds per criterion
DEFAULT_CONTAINER_THRESHOLD = 1  # Container check digits — be strict
DEFAULT_NAME_THRESHOLD = 2       # Names can have more variation
DEFAULT_ROUTE_THRESHOLD = 2      # Route names can have more variation


@dataclass
class FuzzyThresholds:
    """Fuzzy matching thresholds for a specific customer or defaults."""
    container: int = DEFAULT_CONTAINER_THRESHOLD
    name: int = DEFAULT_NAME_THRESHOLD
    route: int = DEFAULT_ROUTE_THRESHOLD


# Per-customer overrides (partner_id → thresholds)
# In production, this would come from a DB table or config service.
# For now, use a simple dict that can be loaded from env or config.
_CUSTOMER_OVERRIDES: dict[int, FuzzyThresholds] = {}


def get_thresholds(partner_id: int | None = None) -> FuzzyThresholds:
    """Get fuzzy thresholds for a specific customer, falling back to defaults."""
    if partner_id and partner_id in _CUSTOMER_OVERRIDES:
        return _CUSTOMER_OVERRIDES[partner_id]
    return FuzzyThresholds()


def set_threshold(partner_id: int, criterion: str, value: int) -> None:
    """Set a fuzzy threshold override for a specific customer."""
    if partner_id not in _CUSTOMER_OVERRIDES:
        _CUSTOMER_OVERRIDES[partner_id] = FuzzyThresholds()
    overrides = _CUSTOMER_OVERRIDES[partner_id]
    if hasattr(overrides, criterion):
        setattr(overrides, criterion, value)
