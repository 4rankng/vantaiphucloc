"""Domain enums. Use StrEnum so values compare equal to plain strings."""

from enum import StrEnum

# Re-export from value_objects (single source of truth)
from app.contexts.operations.domain.value_objects import (  # noqa: F401
    TripOrderStatus,
    WorkOrderStatus,
    WorkType,
)

# Keep WorkType alias here for backward compat — it was already identical.


class LocationAliasStatus(StrEnum):
    PENDING = "PENDING"
    CONFIRMED = "CONFIRMED"
    REJECTED = "REJECTED"
    MERGED = "MERGED"


class SalaryStatus(StrEnum):
    OPEN = "OPEN"
    CALCULATED = "CALCULATED"
    PAID = "PAID"
