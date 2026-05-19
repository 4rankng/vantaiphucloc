"""Billing aggregates."""

from __future__ import annotations

from dataclasses import dataclass, field

from app.contexts.billing.domain.value_objects import (
    RouteSummary,
    SettlementClientRef,
    SettlementPeriod,
    TripLine,
)


@dataclass
class SettlementStatement:
    """The BK SL aggregate.

    Built from operations data (BookedTrips + containers + matched
    delivered-trips) for one customer over one period. VAT and totals are
    computed from the route_summary at read-time — they are not stored.
    """

    client: SettlementClientRef
    period: SettlementPeriod
    trip_lines: list[TripLine] = field(default_factory=list)
    route_summary: list[RouteSummary] = field(default_factory=list)

    @property
    def total_pre_vat(self) -> int:
        return sum(r.total_amount for r in self.route_summary)

    @property
    def vat_amount(self) -> int:
        return round(self.total_pre_vat * 0.08)

    @property
    def total_with_vat(self) -> int:
        return self.total_pre_vat + self.vat_amount
