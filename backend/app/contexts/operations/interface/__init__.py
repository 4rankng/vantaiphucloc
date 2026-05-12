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
from app.contexts.operations.interface.routers.trip_orders import (
    router as trip_orders_router,
)
from app.contexts.operations.interface.routers.work_orders import (
    router as work_orders_router,
)

__all__ = [
    "imports_router",
    "reconcile_router",
    "suggested_routes_router",
    "trip_orders_router",
    "work_orders_router",
]
