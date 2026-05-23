"""Operations interface layer (FastAPI routers)."""

from app.contexts.operations.interface.routers.imports import (
    router as imports_router,
)
from app.contexts.operations.interface.routers.suggested_routes import (
    router as suggested_routes_router,
)
from app.contexts.operations.interface.routers.booked_trips import (
    router as booked_trips_router,
)
from app.contexts.operations.interface.routers.delivered_trips import (
    router as delivered_trips_router,
)
from app.contexts.operations.interface.routers.vendors import (
    router as vendors_router,
)

__all__ = [
    "imports_router",
    "suggested_routes_router",
    "booked_trips_router",
    "delivered_trips_router",
    "vendors_router",
]
