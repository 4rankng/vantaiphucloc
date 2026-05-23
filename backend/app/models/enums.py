"""Domain enums. Use StrEnum so values compare equal to plain strings."""

from enum import StrEnum

# Re-export from value_objects (single source of truth)
from app.contexts.operations.domain.value_objects import (  # noqa: F401
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
