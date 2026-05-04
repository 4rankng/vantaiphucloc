"""Build the data shapes consumed by the PAN-style customer settlement Excel.

Two outputs:

- *trip_lines* — one entry per `TripOrderContainer` in the period, with the
  per-container price split applied. Drives the **SL** sheet.
- *route_summary* — aggregated by (pickup, dropoff), one entry per route, with
  cont-type breakdown. Drives the **BKTT** sheet.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date
from typing import Iterable

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.domain import (
    Client,
    TripOrder,
    TripOrderContainer,
    TripOrderWorkOrder,
    WorkOrder,
)


# ---------------------------------------------------------------------------
# Data shapes
# ---------------------------------------------------------------------------

@dataclass
class TripLine:
    """One row of the SL sheet."""
    trip_date: date
    client_code: str
    container_number: str
    work_type: str           # F20 | F40 | E20 | E40
    tractor_plate: str       # may be ""
    pickup_location: str
    dropoff_location: str
    unit_price: int          # per container
    is_confirmed: bool


@dataclass
class RouteSummary:
    """One row of the BKTT sheet."""
    pickup_location: str
    dropoff_location: str
    f20_count: int = 0
    f40_count: int = 0
    empty_count: int = 0     # E20 + E40
    total_amount: int = 0    # VND, sum of per-container prices in this group


@dataclass
class SettlementData:
    client: Client
    period_start: date
    period_end: date
    trip_lines: list[TripLine] = field(default_factory=list)
    route_summary: list[RouteSummary] = field(default_factory=list)

    @property
    def total_pre_vat(self) -> int:
        return sum(r.total_amount for r in self.route_summary)

    @property
    def vat_amount(self) -> int:
        # ROUND(K56 * 0.08, 0) — banker's rounding is fine for VND tax line
        return round(self.total_pre_vat * 0.08)

    @property
    def total_with_vat(self) -> int:
        return self.total_pre_vat + self.vat_amount


# ---------------------------------------------------------------------------
# Per-container price split
# ---------------------------------------------------------------------------

def _split_unit_price_per_container(
    trip_unit_price: int,
    containers: list[TripOrderContainer],
) -> dict[int, int]:
    """Allocate the trip's `unit_price` across its containers.

    Strategy (keep the deal-level total intact):
    - 1 container → that container takes the full price.
    - N containers all the same `work_type` → equal split, last container
      absorbs any rounding remainder.
    - N containers of mixed `work_type` → split equally for now (we don't
      have per-line pricing on `TripOrder` to do better). Last container
      absorbs the rounding remainder.

    Returns: {container_id: per_container_price}.
    """
    n = len(containers)
    if n == 0:
        return {}
    if n == 1:
        return {containers[0].id: trip_unit_price}

    base = trip_unit_price // n
    remainder = trip_unit_price - base * n
    out = {}
    for i, c in enumerate(containers):
        out[c.id] = base + (remainder if i == n - 1 else 0)
    return out


# ---------------------------------------------------------------------------
# Loader
# ---------------------------------------------------------------------------

async def load_settlement_data(
    db: AsyncSession,
    client_id: int,
    period_start: date,
    period_end: date,
) -> SettlementData:
    """Pull all `TripOrder`s for *client_id* in [period_start, period_end] and
    produce both the per-container detail and the route-level summary.
    """
    client_res = await db.execute(select(Client).where(Client.id == client_id))
    client = client_res.scalar_one_or_none()
    if client is None:
        raise ValueError(f"Khách hàng id={client_id} không tồn tại")

    trip_query = (
        select(TripOrder)
        .where(TripOrder.client_id == client_id)
        .where(TripOrder.trip_date >= period_start)
        .where(TripOrder.trip_date <= period_end)
        .where(TripOrder.status != "CANCELLED")
        .order_by(TripOrder.trip_date.asc(), TripOrder.id.asc())
    )
    trips: list[TripOrder] = (await db.execute(trip_query)).scalars().all()

    if not trips:
        return SettlementData(
            client=client, period_start=period_start, period_end=period_end
        )

    trip_ids = [t.id for t in trips]

    # Containers
    cont_res = await db.execute(
        select(TripOrderContainer).where(TripOrderContainer.trip_order_id.in_(trip_ids))
    )
    containers_by_trip: dict[int, list[TripOrderContainer]] = {}
    for c in cont_res.scalars().all():
        containers_by_trip.setdefault(c.trip_order_id, []).append(c)

    # Tractor plate via TripOrderWorkOrder → WorkOrder
    join_res = await db.execute(
        select(TripOrderWorkOrder).where(TripOrderWorkOrder.trip_order_id.in_(trip_ids))
    )
    join_rows = list(join_res.scalars().all())
    wo_ids = list({r.work_order_id for r in join_rows})
    plate_by_wo: dict[int, str] = {}
    if wo_ids:
        wo_res = await db.execute(select(WorkOrder).where(WorkOrder.id.in_(wo_ids)))
        for wo in wo_res.scalars().all():
            plate_by_wo[wo.id] = wo.tractor_plate or ""
    plates_by_trip: dict[int, list[str]] = {}
    for r in join_rows:
        plate = plate_by_wo.get(r.work_order_id, "")
        if plate:
            plates_by_trip.setdefault(r.trip_order_id, []).append(plate)

    client_code = (client.code or "").strip() or client.name

    trip_lines: list[TripLine] = []
    for trip in trips:
        conts = containers_by_trip.get(trip.id, [])
        if not conts:
            continue  # nothing billable
        prices = _split_unit_price_per_container(trip.unit_price, conts)
        plates = plates_by_trip.get(trip.id, [])
        plate_str = ", ".join(sorted(set(plates))) if plates else ""
        for c in conts:
            trip_lines.append(
                TripLine(
                    trip_date=trip.trip_date,
                    client_code=client_code,
                    container_number=c.container_number,
                    work_type=(c.work_type or "").upper(),
                    tractor_plate=plate_str,
                    pickup_location=trip.pickup_location or "",
                    dropoff_location=trip.dropoff_location or "",
                    unit_price=int(prices.get(c.id, 0)),
                    is_confirmed=bool(trip.is_confirmed),
                )
            )

    route_summary = _aggregate_routes(trip_lines)

    return SettlementData(
        client=client,
        period_start=period_start,
        period_end=period_end,
        trip_lines=trip_lines,
        route_summary=route_summary,
    )


def _aggregate_routes(lines: Iterable[TripLine]) -> list[RouteSummary]:
    """Group lines by (pickup, dropoff) → RouteSummary."""
    bucket: dict[tuple[str, str], RouteSummary] = {}
    for line in lines:
        key = (line.pickup_location, line.dropoff_location)
        s = bucket.get(key)
        if s is None:
            s = RouteSummary(
                pickup_location=line.pickup_location,
                dropoff_location=line.dropoff_location,
            )
            bucket[key] = s
        if line.work_type == "F20":
            s.f20_count += 1
        elif line.work_type == "F40":
            s.f40_count += 1
        elif line.work_type in ("E20", "E40"):
            s.empty_count += 1
        s.total_amount += line.unit_price

    return sorted(
        bucket.values(),
        key=lambda r: (r.pickup_location.lower(), r.dropoff_location.lower()),
    )


# ---------------------------------------------------------------------------
# Period helper (PAN-style: 26th-of-prev-month → 25th of selected month)
# ---------------------------------------------------------------------------

def settlement_period_for(year: int, month: int) -> tuple[date, date]:
    """Return (start, end) for the customer's "Tháng MM/YYYY" — 26th of
    previous month through 25th of the selected month.
    """
    end = date(year, month, 25)
    if month == 1:
        start = date(year - 1, 12, 26)
    else:
        start = date(year, month - 1, 26)
    return start, end
