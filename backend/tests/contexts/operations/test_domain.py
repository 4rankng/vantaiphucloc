"""Pure-Python unit tests for the Operations domain layer."""

from __future__ import annotations

from datetime import date

import pytest

from app.contexts.operations.domain.entities import BookedTrip, DeliveredTrip
from app.contexts.operations.domain.exceptions import (
    ContainerCountInvalid,
    InvalidStateTransition,
)
from app.contexts.operations.domain.value_objects import (
    BookedTripId,
    BookedTripStatus,
    DeliveredTripId,
    DeliveredTripStatus,
)


# ── BookedTrip ────────────────────────────────────────────────────


def _make_trip(*, status: str = BookedTripStatus.PENDING, id_: int | None = 1) -> BookedTrip:
    return BookedTrip(
        id=BookedTripId(id_) if id_ is not None else None,
        trip_date=date(2026, 5, 5),
        partner_id=10,
        pickup_location_id=100,
        dropoff_location_id=200,
        status=status,
    )


def test_trip_match_and_unmatch() -> None:
    t = _make_trip()
    assert t.status == BookedTripStatus.PENDING
    t.match()
    assert t.status == BookedTripStatus.MATCHED
    t.unmatch()
    assert t.status == BookedTripStatus.PENDING


def test_trip_match_idempotent() -> None:
    t = _make_trip()
    t.match()
    t.match()  # no-op
    assert t.status == BookedTripStatus.MATCHED


def test_trip_unmatch_from_pending_is_noop() -> None:
    t = _make_trip()
    t.unmatch()  # idempotent — PENDING is fine
    assert t.status == BookedTripStatus.PENDING



def test_trip_cancel_sets_status() -> None:
    t = _make_trip()
    t.cancel()
    assert t.status == BookedTripStatus.CANCELLED


def test_trip_add_container_enforces_same_work_type() -> None:
    t = _make_trip()
    t.add_container(container_number="ABCU0000017", work_type="F20")
    with pytest.raises(ValueError):
        t.add_container(container_number="ABCU0000022", work_type="F40")


def test_trip_add_container_enforces_quantity_rules() -> None:
    t = _make_trip()
    # F40 → max 1
    t.add_container(container_number="ABCU0000017", work_type="F40")
    with pytest.raises(ContainerCountInvalid):
        t.add_container(container_number="ABCU0000022", work_type="F40")

    # F20 → max 2
    t2 = _make_trip(id_=2)
    t2.add_container(container_number="EFGH0000011", work_type="F20")
    t2.add_container(container_number="EFGH0000027", work_type="F20")
    with pytest.raises(ContainerCountInvalid):
        t2.add_container(container_number="EFGH0000032", work_type="F20")


def test_trip_apply_pricing_snapshot() -> None:
    t = _make_trip()
    t.apply_pricing_snapshot(
        unit_price=1_500_000,
        driver_salary=300_000,
        allowance=50_000,
        pricing_id=99,
    )
    assert t.unit_price == 1_500_000
    assert t.driver_salary == 300_000
    assert t.pricing_id == 99


def test_trip_link_unlink_delivered_trips_idempotent() -> None:
    t = _make_trip()
    t.link_delivered_trip(7)
    t.link_delivered_trip(7)
    assert t.matched_delivered_trip_ids == [7]
    t.unlink_delivered_trip(7)
    assert t.matched_delivered_trip_ids == []
    t.unlink_delivered_trip(7)  # idempotent


def test_trip_confirm_requires_lock() -> None:
    t = _make_trip()
    with pytest.raises(BookedTripLocked):
        t.confirm(user_id=33)
    t.lock(user_id=42)
    t.confirm(user_id=33)
    assert t.is_confirmed is True
    assert t.confirmed_by == 33


# ── DeliveredTrip ────────────────────────────────────────────────────


def _make_wo(*, status: str = DeliveredTripStatus.PENDING, id_: int | None = 1) -> DeliveredTrip:
    return DeliveredTrip(
        id=DeliveredTripId(id_) if id_ is not None else None,
        partner_id=10,
        pickup_location_id=100,
        dropoff_location_id=200,
        driver_id=5,
        status=status,
    )


def test_wo_pending_to_matched() -> None:
    w = _make_wo()
    w.match()
    assert w.status == DeliveredTripStatus.MATCHED


def test_wo_match_idempotent() -> None:
    w = _make_wo()
    w.match()
    w.match()  # no-op
    assert w.status == DeliveredTripStatus.MATCHED


def test_wo_invalid_match_from_completed() -> None:
    w = _make_wo()
    w.status = DeliveredTripStatus.COMPLETED
    with pytest.raises(InvalidStateTransition):
        w.match()


def test_wo_apply_pricing_snapshot() -> None:
    w = _make_wo()
    w.apply_pricing_snapshot(
        unit_price=1_000_000, driver_salary=200_000,
        allowance=50_000, pricing_id=11,
    )
    assert w.unit_price == 1_000_000
    assert w.driver_salary == 200_000
    assert w.allowance == 50_000


def test_wo_unmatch_only_from_matched() -> None:
    w = _make_wo()
    with pytest.raises(InvalidStateTransition):
        w.unmatch()
    w.match()
    w.unmatch()
    assert w.status == DeliveredTripStatus.PENDING
