"""Operations application layer.

Use cases that orchestrate booked-trip / delivered-trip aggregates and the
TO↔WO reconciliation flow. They depend on the domain repositories and
the AsyncSession for transaction control. Cross-context calls go to
the customer_pricing infrastructure layer (pricing lookup, location
resolver) — kept narrow and documented.
"""

from app.contexts.operations.application.reconciliation import (
    MatchTripToDeliveredTrip,
    ReconciliationConflict,
    UnmatchTripFromDeliveredTrip,
)
from app.contexts.operations.application.booked_trips import (
    ApplyPricingToTrips,
    CancelBookedTrip,
    ConfirmBookedTrip,
    CreateBookedTrip,
    CreateBookedTripFromImport,
    DeleteBookedTrip,
    GetBookedTrip,
    ListBookedTrips,
    UpdateBookedTrip,
)
from app.contexts.operations.application.delivered_trips import (
    BatchCreateDeliveredTrips,
    CreateDeliveredTrip,
    CurrentUserContext,
    GetDeliveredTrip,
    ListDeliveredTrips,
    UpdateDeliveredTrip,
)

__all__ = [
    # BookedTrip
    "ApplyPricingToTrips",
    "CancelBookedTrip",
    "ConfirmBookedTrip",
    "CreateBookedTrip",
    "CreateBookedTripFromImport",
    "DeleteBookedTrip",
    "GetBookedTrip",
    "ListBookedTrips",
    "UpdateBookedTrip",
    # DeliveredTrip
    "BatchCreateDeliveredTrips",
    "CreateDeliveredTrip",
    "CurrentUserContext",
    "GetDeliveredTrip",
    "ListDeliveredTrips",
    "UpdateDeliveredTrip",
    # Reconciliation
    "MatchTripToDeliveredTrip",
    "ReconciliationConflict",
    "UnmatchTripFromDeliveredTrip",
]
