# Re-export all ORM models so Alembic's autogenerate can discover every table
# by simply importing this package.

from .base import User  # noqa: F401
from .domain import (  # noqa: F401
    Vehicle,
    Client,
    Vendor,
    Partner,
    Location,
    LocationAlias,
    RoutePricing,
    VendorRoutePricing,
    DeliveredTrip,
    BookedTrip,
    Setting,
    VehicleDriver,
    VehicleExpense,
    DriverSalaryConfig,
    DriverSalary,
)
from .operation_type import OperationType  # noqa: F401
from .audit_log import AuditLog  # noqa: F401
from .push import PushSubscription  # noqa: F401

__all__ = [
    "User",
    "Vehicle",
    "Client",
    "Vendor",
    "Partner",
    "Location",
    "LocationAlias",
    "RoutePricing",
    "VendorRoutePricing",
    "DeliveredTrip",
    "BookedTrip",
    "Setting",
    "VehicleDriver",
    "VehicleExpense",
    "DriverSalaryConfig",
    "DriverSalary",
    "OperationType",
    "AuditLog",
    "PushSubscription",
]
