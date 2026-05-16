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
    CHUNG = "CHUNG"         # General overhead (not tied to a specific vehicle)


class OperationType(StrEnum):
    XUAT_NHAP_TAU = "XUAT_NHAP_TAU"       # Xuất / Nhập tàu
    CHUYEN_BAI = "CHUYEN_BAI"             # Chuyển bãi
    LAY_VO_HA_HANG = "LAY_VO_HA_HANG"     # Lấy vỏ hạ hàng
    CHAY_SA_LAN = "CHAY_SA_LAN"           # Chạy sà lan
    DONG_KHO = "DONG_KHO"                 # Đóng kho
