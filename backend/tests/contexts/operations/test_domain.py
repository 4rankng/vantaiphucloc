"""Pure-Python unit tests for the Operations domain layer."""

from __future__ import annotations

from datetime import date

from app.contexts.operations.domain.entities import BookedTrip, DeliveredTrip
from app.contexts.operations.domain.value_objects import (
    BookedTripId,
    DeliveredTripId,
)


def _make_trip(*, id_: int | None = 1) -> BookedTrip:
    return BookedTrip(
        id=BookedTripId(id_) if id_ is not None else None,
        trip_date=date(2026, 5, 5),
        client_id=10,
        pickup_location_id=100,
        dropoff_location_id=200,
    )


def _make_wo(*, id_: int | None = 1) -> DeliveredTrip:
    return DeliveredTrip(
        id=DeliveredTripId(id_) if id_ is not None else None,
        client_id=10,
        pickup_location_id=100,
        dropoff_location_id=200,
        driver_id=5,
    )


# ── BookedTrip ────────────────────────────────────────────────────


def test_trip_has_flat_container_fields() -> None:
    t = BookedTrip(
        id=None,
        trip_date=date(2026, 1, 1),
        client_id=1,
        pickup_location_id=1,
        dropoff_location_id=2,
        cont_number="MSKU1234567",
        cont_type="F20",
    )
    assert t.cont_number == "MSKU1234567"
    assert t.cont_type == "F20"


# ── DeliveredTrip ────────────────────────────────────────────────────


def test_wo_apply_pricing_snapshot() -> None:
    w = _make_wo()
    w.apply_pricing(
        revenue=1_000_000,
        driver_salary=200_000,
    )
    assert w.revenue == 1_000_000
    assert w.driver_salary == 200_000


def test_wo_has_flat_container_fields() -> None:
    w = DeliveredTrip(
        id=None,
        client_id=1,
        pickup_location_id=1,
        dropoff_location_id=2,
        driver_id=5,
        cont_number="ABCU0000001",
        cont_type="E40",
        vehicle_plate="51A-12345",
        revenue=2_000_000,
    )
    assert w.cont_number == "ABCU0000001"
    assert w.vehicle_plate == "51A-12345"
    assert w.vendor_id is None
