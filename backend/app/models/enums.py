"""Domain enums. Use StrEnum so values compare equal to plain strings."""

from enum import StrEnum


class WorkOrderStatus(StrEnum):
    PENDING = "PENDING"
    MATCHED = "MATCHED"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class TripOrderStatus(StrEnum):
    DRAFT = "DRAFT"
    PENDING = "PENDING"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class WorkType(StrEnum):
    E20 = "E20"
    E40 = "E40"
    F20 = "F20"
    F40 = "F40"


class SalaryStatus(StrEnum):
    OPEN = "OPEN"
    CALCULATED = "CALCULATED"
    PAID = "PAID"
