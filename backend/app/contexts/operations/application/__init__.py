"""Operations application layer.

Use cases that orchestrate trip-order / work-order aggregates and the
TO↔WO reconciliation flow. They depend on the domain repositories and
the AsyncSession for transaction control. Cross-context calls go to
the customer_pricing infrastructure layer (pricing lookup, location
resolver) — kept narrow and documented.
"""

from app.contexts.operations.application.reconciliation import (
    MatchTripToWorkOrder,
    ReconciliationConflict,
    UnmatchTripFromWorkOrder,
)
from app.contexts.operations.application.trip_orders import (
    ApplyPricingToTrips,
    CancelTripOrder,
    ConfirmTripOrder,
    CreateTripOrder,
    CreateTripOrderFromImport,
    DeleteTripOrder,
    GetTripOrder,
    ListTripOrders,
    UpdateTripOrder,
)
from app.contexts.operations.application.work_orders import (
    BatchCreateWorkOrders,
    CancelWorkOrder,
    CreateWorkOrder,
    CurrentUserContext,
    GetWorkOrder,
    ListWorkOrders,
    UpdateWorkOrder,
)

__all__ = [
    # TripOrder
    "ApplyPricingToTrips",
    "CancelTripOrder",
    "ConfirmTripOrder",
    "CreateTripOrder",
    "CreateTripOrderFromImport",
    "DeleteTripOrder",
    "GetTripOrder",
    "ListTripOrders",
    "UpdateTripOrder",
    # WorkOrder
    "BatchCreateWorkOrders",
    "CancelWorkOrder",
    "CreateWorkOrder",
    "CurrentUserContext",
    "GetWorkOrder",
    "ListWorkOrders",
    "UpdateWorkOrder",
    # Reconciliation
    "MatchTripToWorkOrder",
    "ReconciliationConflict",
    "UnmatchTripFromWorkOrder",
]
