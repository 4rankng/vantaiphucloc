"""SQLAlchemy ORM for the Operations context.

Re-exports the existing Base-mapped classes under XxxORM aliases. The
single physical definition still lives in `app.models.domain`.
"""

from __future__ import annotations

from app.models.domain import (
    Reconciliation as ReconciliationORM,
    BookedTrip as BookedTripORM,
    BookedTripContainer as BookedTripContainerORM,
    DeliveredTrip as DeliveredTripORM,
    DeliveredTripContainer as DeliveredTripContainerORM,
)

__all__ = [
    "ReconciliationORM",
    "BookedTripORM",
    "BookedTripContainerORM",
    "DeliveredTripORM",
    "DeliveredTripContainerORM",
]
