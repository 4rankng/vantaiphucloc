"""Operations interface layer (FastAPI routers).

Exposes the four routers that map use cases to HTTP endpoints. Schemas
live in `app.schemas.domain` (shared across contexts) — this layer
imports them rather than redefining them, since they nest cross-context
`*SummaryOut` shapes.
"""

from app.contexts.operations.interface.routers.imports import (
    router as imports_router,
)
from app.contexts.operations.interface.routers.reconcile import (
    router as reconcile_router,
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
from app.contexts.operations.interface.routers.vendor_reconciliation import (
    router as vendor_reconciliation_router,
)
from app.contexts.operations.interface.routers.vendors import (
    router as vendors_router,
)

__all__ = [
    "imports_router",
    "reconcile_router",
    "suggested_routes_router",
    "booked_trips_router",
    "delivered_trips_router",
    "vendor_reconciliation_router",
    "vendors_router",
]
