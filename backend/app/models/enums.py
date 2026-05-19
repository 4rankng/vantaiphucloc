"""Domain enums. Use StrEnum so values compare equal to plain strings."""

from enum import StrEnum

# Re-export from value_objects (single source of truth)
from app.contexts.operations.domain.value_objects import (  # noqa: F401
    BookedTripStatus,
    DeliveredTripStatus,
    WorkType,
)


class SalaryStatus(StrEnum):
    OPEN = "OPEN"
    CALCULATED = "CALCULATED"
    PAID = "PAID"


class VehicleExpenseCategory(StrEnum):
    XANG_DAU = "XANG_DAU"   # Fuel
    SUA_CHUA = "SUA_CHUA"   # Repairs
    TIEN_LUAT = "TIEN_LUAT" # Law/Permits
    KHAC = "KHAC"           # Other


class OperationType(StrEnum):
    XUAT_NHAP_TAU = "XUAT_NHAP_TAU"       # Xuất / Nhập tàu
    CHUYEN_BAI = "CHUYEN_BAI"             # Chuyển bãi
    LAY_VO_HA_HANG = "LAY_VO_HA_HANG"     # Lấy vỏ hạ hàng
    CHAY_SA_LAN = "CHAY_SA_LAN"           # Chạy sà lan
    DONG_KHO = "DONG_KHO"                 # Đóng kho
