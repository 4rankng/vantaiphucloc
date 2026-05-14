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


class VehicleExpenseCategory(StrEnum):
    XANG_DAU = "XANG_DAU"   # Fuel
    SUA_CHUA = "SUA_CHUA"   # Repairs
    KHAC = "KHAC"           # Other vehicle costs
    CHUNG = "CHUNG"         # General overhead (not tied to a specific vehicle)


class VehicleDriverRole(StrEnum):
    PRIMARY = "PRIMARY"
    SECONDARY = "SECONDARY"


class OperationType(StrEnum):
    XUAT_TAU = "XUAT_TAU"       # Xuất tàu (ship export)
    NHAP_TAU = "NHAP_TAU"       # Nhập tàu (ship import)
    CHUYEN_BAI = "CHUYEN_BAI"   # Chuyển bãi (yard transfer)
    KHAC = "KHAC"               # Catch-all / other
