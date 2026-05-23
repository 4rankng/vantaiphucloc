"""Billing value objects.

`SettlementPeriod` enforces start ≤ end. `TripLine`/`RouteSummary` model
the per-container detail and route-aggregate rows the BK SL Excel needs.
`SettlementClientRef` is a denormalized customer projection so the
domain layer doesn't import customer_pricing internals.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date


@dataclass(frozen=True)
class SettlementPeriod:
    start: date
    end: date

    def __post_init__(self) -> None:
        if self.start > self.end:
            raise ValueError("Settlement period start must be <= end")


@dataclass(frozen=True)
class SettlementClientRef:
    id: int
    name: str
    code: str | None = None
    address: str | None = None
    tax_code: str | None = None


@dataclass
class TripLine:
    """One row of the SL sheet (per-container detail)."""

    trip_date: date
    client_code: str
    container_number: str
    cont_type: str          # F20 | F40 | E20 | E40
    work_type: str          # tác nghiệp: XUẤT/NHẬP TÀU, CHUYỂN BÃI, etc.
    vehicle_plate: str      # may be ""
    pickup_location: str
    dropoff_location: str
    unit_price: int
    vessel: str = ""         # ship/vessel name from DeliveredTrip


@dataclass
class RouteSummary:
    """One row of the BKTT sheet (per-route aggregate)."""

    pickup_location: str
    dropoff_location: str
    f20_count: int = 0
    f40_count: int = 0
    empty_count: int = 0
    total_amount: int = 0


def settlement_period_for(year: int, month: int) -> SettlementPeriod:
    """PAN-style customer period: 26th of previous month → 25th of selected month."""
    end = date(year, month, 25)
    if month == 1:
        start = date(year - 1, 12, 26)
    else:
        start = date(year, month - 1, 26)
    return SettlementPeriod(start=start, end=end)
