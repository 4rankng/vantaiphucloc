"""SQLAlchemy ORM for the Operations context.

Re-exports the existing Base-mapped classes under XxxORM aliases. The
single physical definition still lives in `app.models.domain`.
"""

from __future__ import annotations

from app.models.domain import (
    Reconciliation as ReconciliationORM,
    TripContainerPhoto as TripContainerPhotoORM,
    TripOrder as TripOrderORM,
    TripOrderContainer as TripOrderContainerORM,
    TripOrderWorkOrder as TripOrderWorkOrderORM,
    WorkOrder as WorkOrderORM,
    WorkOrderContainer as WorkOrderContainerORM,
)

__all__ = [
    "ReconciliationORM",
    "TripContainerPhotoORM",
    "TripOrderORM",
    "TripOrderContainerORM",
    "TripOrderWorkOrderORM",
    "WorkOrderORM",
    "WorkOrderContainerORM",
]
