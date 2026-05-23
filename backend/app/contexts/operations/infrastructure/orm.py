"""SQLAlchemy ORM for the Operations context.

Re-exports the existing Base-mapped classes under XxxORM aliases. The
single physical definition still lives in `app.models.domain`.
"""

from __future__ import annotations

from app.models.domain import (
    BookedTrip as BookedTripORM,
    DeliveredTrip as DeliveredTripORM,
)

__all__ = [
    "BookedTripORM",
    "DeliveredTripORM",
]
