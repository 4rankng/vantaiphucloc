"""Tests for customer settlement (BK SL).

Covers:
- SqlSettlementDataLoader: DeliveredTrip is the source of truth (matched only)
- RouteSummary groups by (pickup, dropoff, work_type)
- Zero-revenue trip surfaces a warning
"""

import logging
from datetime import date

import pytest

from app.contexts.billing.infrastructure.settlement_loader import (
    SqlSettlementDataLoader,
    _aggregate_routes,
)
from app.contexts.billing.domain.value_objects import (
    SettlementPeriod,
    TripLine,
)
from app.models.domain import (
    BookedTrip,
    Client,
    DeliveredTrip,
    Location,
)


async def _seed_session(db):
    """Create client + locations + a matched and an unmatched trip."""
    client = Client(id=1, code="KH01", name="Cty ABC", tax_code="123", address="HP")
    db.add(client)
    pickup = Location(id=1, name="Cảng Tân Vũ")
    dropoff = Location(id=2, name="Bãi ICD")
    db.add(pickup)
    db.add(dropoff)

    # Matched trip (booked_trip_id set) — should appear in settlement
    matched = DeliveredTrip(
        id=10,
        client_id=1,
        pickup_location_id=1,
        dropoff_location_id=2,
        vessel="MV TEST",
        work_type="CHUYỂN BÃI",
        cont_number="ABCD1234567",
        cont_type="F20",
        vehicle_plate="15C-123.45",
        booked_trip_id=100,
        revenue=500000,
        driver_salary=200000,
        trip_date=date(2026, 5, 10),
    )
    db.add(matched)

    # Unmatched trip (booked_trip_id = None) — should NOT appear
    unmatched = DeliveredTrip(
        id=11,
        client_id=1,
        pickup_location_id=1,
        dropoff_location_id=2,
        work_type="CHUYỂN BÃI",
        cont_number="UNMATCHED01",
        cont_type="F20",
        vehicle_plate="15C-999.99",
        booked_trip_id=None,
        revenue=0,
        driver_salary=0,
        trip_date=date(2026, 5, 11),
    )
    db.add(unmatched)

    # Zero-revenue matched trip — should appear but trigger warning
    zero_rev = DeliveredTrip(
        id=12,
        client_id=1,
        pickup_location_id=1,
        dropoff_location_id=2,
        work_type="CHUYỂN BÃI",
        cont_number="ZEROREV0001",
        cont_type="F40",
        vehicle_plate="15C-000.00",
        booked_trip_id=101,
        revenue=0,
        driver_salary=0,
        trip_date=date(2026, 5, 12),
    )
    db.add(zero_rev)

    # Different work_type, same lane — should be a separate RouteSummary
    other_work = DeliveredTrip(
        id=13,
        client_id=1,
        pickup_location_id=1,
        dropoff_location_id=2,
        work_type="XUẤT/NHẬP TÀU",
        cont_number="OTHERWT0001",
        cont_type="E20",
        vehicle_plate="15C-111.11",
        booked_trip_id=102,
        revenue=300000,
        driver_salary=100000,
        trip_date=date(2026, 5, 13),
    )
    db.add(other_work)

    # Trip outside period — should be excluded
    outside = DeliveredTrip(
        id=14,
        client_id=1,
        pickup_location_id=1,
        dropoff_location_id=2,
        work_type="CHUYỂN BÃI",
        cont_number="OUTSIDEXXXX",
        cont_type="F20",
        booked_trip_id=103,
        revenue=999999,
        trip_date=date(2026, 3, 1),
    )
    db.add(outside)

    # A BookedTrip with no DeliveredTrip counterpart — must NOT appear
    orphan_booked = BookedTrip(
        id=999,
        trip_date=date(2026, 5, 15),
        client_id=1,
        pickup_location_id=1,
        dropoff_location_id=2,
        work_type="CHUYỂN BÃI",
    )
    db.add(orphan_booked)

    await db.flush()


@pytest.mark.asyncio
async def test_loader_uses_delivered_trip_as_source_of_truth(db_session):
    await _seed_session(db_session)

    loader = SqlSettlementDataLoader(db_session)
    period = SettlementPeriod(start=date(2026, 5, 1), end=date(2026, 5, 31))
    stmt = await loader.load(client_id=1, period=period)

    container_numbers = {line.container_number for line in stmt.trip_lines}
    # Matched trips present
    assert "ABCD1234567" in container_numbers
    assert "ZEROREV0001" in container_numbers
    assert "OTHERWT0001" in container_numbers
    # Unmatched trip excluded
    assert "UNMATCHED01" not in container_numbers
    # Orphan BookedTrip (no delivered counterpart) excluded
    assert len(container_numbers) == 3
    # Outside-period trip excluded
    assert "OUTSIDEXXXX" not in container_numbers


@pytest.mark.asyncio
async def test_loader_pulls_revenue_from_delivered_trip(db_session):
    await _seed_session(db_session)

    loader = SqlSettlementDataLoader(db_session)
    period = SettlementPeriod(start=date(2026, 5, 1), end=date(2026, 5, 31))
    stmt = await loader.load(client_id=1, period=period)

    by_container = {line.container_number: line.unit_price for line in stmt.trip_lines}
    assert by_container["ABCD1234567"] == 500000
    assert by_container["ZEROREV0001"] == 0
    assert by_container["OTHERWT0001"] == 300000


@pytest.mark.asyncio
async def test_loader_warns_on_zero_revenue(db_session, caplog):
    await _seed_session(db_session)

    loader = SqlSettlementDataLoader(db_session)
    period = SettlementPeriod(start=date(2026, 5, 1), end=date(2026, 5, 31))

    with caplog.at_level(logging.WARNING, logger="app.contexts.billing.infrastructure.settlement_loader"):
        await loader.load(client_id=1, period=period)

    assert any("revenue=0" in record.message for record in caplog.records)


def test_aggregate_routes_groups_by_work_type():
    lines = [
        TripLine(
            trip_date=date(2026, 5, 10),
            client_code="X",
            container_number="A",
            cont_type="F20",
            work_type="CHUYỂN BÃI",
            vehicle_plate="",
            pickup_location="P1",
            dropoff_location="D1",
            unit_price=100,
        ),
        TripLine(
            trip_date=date(2026, 5, 11),
            client_code="X",
            container_number="B",
            cont_type="F20",
            work_type="CHUYỂN BÃI",
            vehicle_plate="",
            pickup_location="P1",
            dropoff_location="D1",
            unit_price=200,
        ),
        TripLine(
            trip_date=date(2026, 5, 12),
            client_code="X",
            container_number="C",
            cont_type="E20",
            work_type="XUẤT/NHẬP TÀU",
            vehicle_plate="",
            pickup_location="P1",
            dropoff_location="D1",
            unit_price=300,
        ),
    ]

    summaries = _aggregate_routes(lines)
    assert len(summaries) == 2, "Same lane but different work_type must be separate buckets"

    by_key = {(s.pickup_location, s.dropoff_location, s.work_type): s for s in summaries}
    chuyen_bai = by_key[("P1", "D1", "CHUYỂN BÃI")]
    assert chuyen_bai.f20_count == 2
    assert chuyen_bai.total_amount == 300

    xuat_nhap = by_key[("P1", "D1", "XUẤT/NHẬP TÀU")]
    assert xuat_nhap.empty_count == 1
    assert xuat_nhap.total_amount == 300


def test_aggregate_routes_empty_input():
    assert _aggregate_routes([]) == []
