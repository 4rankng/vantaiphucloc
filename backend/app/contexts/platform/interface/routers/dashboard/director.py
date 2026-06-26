"""Dashboard director overview + drilldown endpoints."""

from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.domain import (
    Client,
    DeliveredTrip,
    Location,
)
from app.models.base import User
from app.core.deps import get_current_user
from app.database import get_db
from app.schemas.domain import (
    DirectorDashboardOut,
    DirectorDashboardDrilldownOut,
    DirectorDashboardDrilldownTotals,
    DirectorDashboardDrilldownClient,
    DirectorDashboardDrilldownVehicle,
    VehiclePnLGroup,
    VehiclePnLRow,
)

from ._shared import _compute_vehicle_pnl_rows, _row_cost

router = APIRouter()


@router.get("/director/drilldown", response_model=DirectorDashboardDrilldownOut)
async def get_director_dashboard_drilldown(
    date_from: str = Query(..., description="YYYY-MM-DD"),
    date_to: str = Query(..., description="YYYY-MM-DD"),
    _current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Director KPI drill-down grouped by client and vehicle."""
    try:
        df = datetime.strptime(date_from, "%Y-%m-%d").date()
        dt = datetime.strptime(date_to, "%Y-%m-%d").date()
    except ValueError:
        from fastapi import HTTPException

        raise HTTPException(
            status_code=422, detail="Invalid date format. Use YYYY-MM-DD."
        )

    vehicle_plate_expr = func.coalesce(DeliveredTrip.vehicle_plate, "")

    rows = (
        await db.execute(
            select(
                DeliveredTrip.client_id,
                Client.name,
                vehicle_plate_expr,
                DeliveredTrip.booked_trip_id,
                func.count(DeliveredTrip.id),
                func.coalesce(func.sum(DeliveredTrip.revenue), 0),
                func.coalesce(func.sum(DeliveredTrip.driver_salary), 0),
            )
            .join(Client, Client.id == DeliveredTrip.client_id)
            .where(DeliveredTrip.trip_date >= df, DeliveredTrip.trip_date <= dt)
            .group_by(
                DeliveredTrip.client_id,
                Client.name,
                vehicle_plate_expr,
                DeliveredTrip.booked_trip_id,
            )
        )
    ).all()

    clients: dict[int, dict] = {}
    totals = {
        "total": 0,
        "matched": 0,
        "pending": 0,
        "revenue": 0,
        "cost": 0,
        "profit": 0,
    }

    for (
        client_id,
        client_name,
        vehicle_plate,
        booked_trip_id,
        trip_count,
        revenue,
        cost,
    ) in rows:
        trip_count = int(trip_count or 0)
        revenue = int(revenue or 0)
        cost = int(cost or 0)
        matched = trip_count if booked_trip_id is not None else 0
        pending = trip_count if booked_trip_id is None else 0
        profit = revenue - cost
        plate = vehicle_plate or "Chưa có biển số"

        client_bucket = clients.setdefault(
            client_id,
            {
                "client_id": client_id,
                "client_name": client_name,
                "trip_count": 0,
                "matched": 0,
                "pending": 0,
                "revenue": 0,
                "cost": 0,
                "profit": 0,
                "vehicles": {},
            },
        )
        vehicle_bucket = client_bucket["vehicles"].setdefault(
            plate,
            {
                "vehicle_plate": plate,
                "trip_count": 0,
                "matched": 0,
                "pending": 0,
                "revenue": 0,
                "cost": 0,
                "profit": 0,
            },
        )

        for bucket in (totals, client_bucket, vehicle_bucket):
            bucket["total" if bucket is totals else "trip_count"] += trip_count
            bucket["matched"] += matched
            bucket["pending"] += pending
            bucket["revenue"] += revenue
            bucket["cost"] += cost
            bucket["profit"] += profit

    client_items = []
    for client in clients.values():
        vehicles = [
            DirectorDashboardDrilldownVehicle(**vehicle)
            for vehicle in sorted(
                client["vehicles"].values(),
                key=lambda item: (-item["revenue"], item["vehicle_plate"]),
            )
        ]
        client_items.append(
            DirectorDashboardDrilldownClient(
                client_id=client["client_id"],
                client_name=client["client_name"],
                trip_count=client["trip_count"],
                matched=client["matched"],
                pending=client["pending"],
                revenue=client["revenue"],
                cost=client["cost"],
                profit=client["profit"],
                vehicles=vehicles,
            )
        )

    return DirectorDashboardDrilldownOut(
        date_from=df,
        date_to=dt,
        totals=DirectorDashboardDrilldownTotals(**totals),
        clients=sorted(
            client_items, key=lambda item: (-item.revenue, item.client_name)
        ),
    )


@router.get("/director", response_model=DirectorDashboardOut)
async def get_director_dashboard(
    date_from: str = Query(..., description="YYYY-MM-DD"),
    date_to: str = Query(..., description="YYYY-MM-DD"),
    _current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Director dashboard: KPIs, trends, top routes/drivers, daily buckets.

    Computes current period stats and compares with the previous calendar month
    to produce delta percentages.
    """
    try:
        df = datetime.strptime(date_from, "%Y-%m-%d").date()
        dt = datetime.strptime(date_to, "%Y-%m-%d").date()
    except ValueError:
        from fastapi import HTTPException

        raise HTTPException(
            status_code=422, detail="Invalid date format. Use YYYY-MM-DD."
        )

    # Previous period: same-length window ending the day before df
    span = (dt - df).days + 1
    prev_dt = df - timedelta(days=1)
    prev_df = prev_dt - timedelta(days=span - 1)

    async def _period_stats(start, end):
        """Return (total, matched, pending, revenue, buckets, top_routes, top_drivers)."""
        rows = (
            await db.execute(
                select(
                    DeliveredTrip.trip_date,
                    DeliveredTrip.booked_trip_id,
                    func.count(DeliveredTrip.id),
                    func.coalesce(func.sum(DeliveredTrip.revenue), 0),
                )
                .where(DeliveredTrip.trip_date >= start, DeliveredTrip.trip_date <= end)
                .group_by(DeliveredTrip.trip_date, DeliveredTrip.booked_trip_id)
            )
        ).all()

        date_map = {}
        total = matched = pending = revenue = 0
        for trip_date, booked_id, cnt, rev in rows:
            ds = trip_date.isoformat()
            bucket = date_map.setdefault(ds, {"matched": 0, "pending": 0})
            total += cnt
            if booked_id is not None:
                bucket["matched"] += cnt
                matched += cnt
            else:
                bucket["pending"] += cnt
                pending += cnt
            revenue += int(rev)

        buckets = []
        cur, idx = start, 0
        while cur <= end:
            ds = cur.isoformat()
            b = date_map.get(ds, {"matched": 0, "pending": 0})
            buckets.append(
                {
                    "day": idx + 1,
                    "date": ds,
                    "matched": b["matched"],
                    "pending": b["pending"],
                }
            )
            cur += timedelta(days=1)
            idx += 1

        # Top routes
        from sqlalchemy.orm import aliased

        PickupLoc = aliased(Location)
        DropLoc = aliased(Location)
        route_rows = (
            await db.execute(
                select(
                    func.concat(PickupLoc.name, " → ", DropLoc.name).label("route"),
                    func.count(DeliveredTrip.id).label("cnt"),
                )
                .join(PickupLoc, PickupLoc.id == DeliveredTrip.pickup_location_id)
                .join(DropLoc, DropLoc.id == DeliveredTrip.dropoff_location_id)
                .where(DeliveredTrip.trip_date >= start, DeliveredTrip.trip_date <= end)
                .group_by(PickupLoc.name, DropLoc.name)
                .order_by(func.count(DeliveredTrip.id).desc())
                .limit(5)
            )
        ).all()
        top_routes = [{"name": r.route, "count": r.cnt} for r in route_rows]

        # Top drivers
        driver_rows = (
            await db.execute(
                select(
                    User.full_name.label("name"),
                    DeliveredTrip.vehicle_plate.label("plate"),
                    func.count(DeliveredTrip.id).label("cnt"),
                )
                .join(User, User.id == DeliveredTrip.driver_id)
                .where(DeliveredTrip.trip_date >= start, DeliveredTrip.trip_date <= end)
                .group_by(User.full_name, DeliveredTrip.vehicle_plate)
                .order_by(func.count(DeliveredTrip.id).desc())
                .limit(5)
            )
        ).all()
        top_drivers = [
            {"name": r.name, "plate": r.plate or "", "trip_count": r.cnt}
            for r in driver_rows
        ]

        return total, matched, pending, revenue, buckets, top_routes, top_drivers

    (
        total,
        matched,
        pending,
        revenue,
        buckets,
        top_routes,
        top_drivers,
    ) = await _period_stats(df, dt)
    prev_total, prev_matched, prev_pending, prev_revenue, _, _, _ = await _period_stats(
        prev_df, prev_dt
    )

    # ── Per-vehicle PnL, split own-fleet vs vendor ──────────────────────────
    pnl_rows = await _compute_vehicle_pnl_rows(db, df, dt)
    prev_pnl_rows = await _compute_vehicle_pnl_rows(db, prev_df, prev_dt)

    own_rows = [r for r in pnl_rows if not r.is_vendor]
    vendor_rows = [r for r in pnl_rows if r.is_vendor]

    def _group(rows: list[VehiclePnLRow]) -> VehiclePnLGroup:
        return VehiclePnLGroup(
            rows=rows,
            total_revenue=sum(r.revenue for r in rows),
            total_cost=sum(_row_cost(r) for r in rows),
            total_profit=sum(r.loi_nhuan for r in rows),
            trip_count=0,
        )

    own_group = _group(own_rows)
    vendor_group = _group(vendor_rows)

    total_cost = sum(_row_cost(r) for r in pnl_rows)
    profit = revenue - total_cost
    prev_total_cost = sum(_row_cost(r) for r in prev_pnl_rows)
    prev_profit = prev_revenue - prev_total_cost

    def delta(curr, prev):
        if not prev:
            return None
        return round(((curr - prev) / abs(prev)) * 100, 1)

    return DirectorDashboardOut(
        total=total,
        matched=matched,
        pending=pending,
        match_rate=round(matched / total * 100) if total > 0 else None,
        revenue=revenue,
        avg_revenue_per_trip=round(revenue / total) if total > 0 else 0,
        total_cost=total_cost,
        profit=profit,
        total_delta=delta(total, prev_total),
        matched_delta=delta(matched, prev_matched),
        pending_delta=delta(pending, prev_pending),
        revenue_delta=delta(revenue, prev_revenue),
        cost_delta=delta(total_cost, prev_total_cost),
        profit_delta=delta(profit, prev_profit),
        buckets=buckets,
        top_routes=top_routes,
        top_drivers=top_drivers,
        own_fleet_pnl=own_group,
        vendor_pnl=vendor_group,
    )
