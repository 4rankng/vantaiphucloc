"""SQLAlchemy ORM for the Operations context.

Re-exports the existing Base-mapped classes under XxxORM aliases. The
single physical definition still lives in `app.models.domain` —
migrating those declarations into this module is a follow-up once all
contexts that touch them are themselves extracted.
"""

from __future__ import annotations

from app.models.domain import (
    TripContainerPhoto as TripContainerPhotoORM,
    TripOrder as TripOrderORM,
    TripOrderContainer as TripOrderContainerORM,
    TripOrderWorkOrder as TripOrderWorkOrderORM,
    WorkOrder as WorkOrderORM,
    WorkOrderContainer as WorkOrderContainerORM,
)

__all__ = [
    "TripContainerPhotoORM",
    "TripOrderORM",
    "TripOrderContainerORM",
    "TripOrderWorkOrderORM",
    "WorkOrderORM",
    "WorkOrderContainerORM",
]
