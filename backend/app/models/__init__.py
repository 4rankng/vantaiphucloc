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
    Pricing,
    PricingLine,
    DeliveredTrip,
    DeliveredTripContainer,
    BookedTrip,
    BookedTripContainer,
    Reconciliation,
    Setting,
    CustomerImportTemplate,
)
from .audit_log import AuditLog  # noqa: F401

__all__ = [
    "User",
    "Vehicle",
    "Client",
    "Vendor",
    "Partner",
    "Location",
    "LocationAlias",
    "Pricing",
    "PricingLine",
    "DeliveredTrip",
    "DeliveredTripContainer",
    "BookedTrip",
    "BookedTripContainer",
    "Reconciliation",
    "Setting",
    "CustomerImportTemplate",
    "AuditLog",
]
