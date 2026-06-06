"""Customer & Pricing interface layer (FastAPI routers + Pydantic schemas)."""

from app.contexts.customer_pricing.interface.routers.location_aliases import (
    router as location_aliases_router,
)
from app.contexts.customer_pricing.interface.routers.locations import (
    router as locations_router,
)
from app.contexts.customer_pricing.interface.routers.contacts import (
    router as contacts_router,
)

__all__ = [
    "location_aliases_router",
    "locations_router",
    "contacts_router",
]
