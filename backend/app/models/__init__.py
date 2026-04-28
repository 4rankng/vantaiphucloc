# Re-export all ORM models so Alembic's autogenerate can discover every table
# by simply importing this package.

from .base import User  # noqa: F401
from .domain import (  # noqa: F401
    Company,
    Client,
    Route,
    Pricing,
    PricingLine,
    WorkOrder,
    WorkOrderContainer,
    TripOrder,
    TripOrderWorkOrder,
    SalaryPeriod,
    SalaryPeriodConfig,
)

__all__ = [
    "User",
    "Company",
    "Client",
    "Route",
    "Pricing",
    "PricingLine",
    "WorkOrder",
    "WorkOrderContainer",
    "TripOrder",
    "TripOrderWorkOrder",
    "SalaryPeriod",
    "SalaryPeriodConfig",
]
