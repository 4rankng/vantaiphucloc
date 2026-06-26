"""Shared helpers reused across dashboard sub-routers.

Kept here (not in ``__init__``) so sub-modules can import without creating a
circular dependency on the top-level router assembly.
"""

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.domain import (
    Vehicle,
    VehicleDriver,
    VehicleExpense,
    DeliveredTrip,
    Vendor,
)
from app.schemas.domain import (
    VehicleExpenseSummary,
    VehiclePnLRow,
)


async def _compute_vehicle_pnl_rows(db: AsyncSession, df, dt) -> list[VehiclePnLRow]:
    """Compute per-vehicle PnL rows for a date range.

    Reused by both the /vehicle-pnl endpoint and the /director dashboard so the
    two stay in sync. Mirrors the logic in get_vehicle_pnl (rev, cp_xe, salary,
    base salary, vendor cost) but without HTTP plumbing.
    """
    from app.contexts.payroll.infrastructure.repositories import (
        SqlDriverSalaryConfigRepository,
    )
    from app.contexts.payroll.domain.base_salary import effective_base_salary
    from app.core.pricing_lookup import TripPriceInfo, lookup_vendor_prices

    veh_rows = (
        await db.execute(
            select(Vehicle.id, Vehicle.plate, Vehicle.vendor_id).where(
                Vehicle.is_active == True  # noqa: E712
            )
        )
    ).all()
    vehicles: dict[int, str] = {r[0]: r[1] for r in veh_rows}
    vendor_id_by_vehicle: dict[int, int | None] = {r[0]: r[2] for r in veh_rows}

    all_vendor_ids = list({r[2] for r in veh_rows if r[2] is not None})
    vendor_name_by_id: dict[int, str] = {}
    if all_vendor_ids:
        vnd_rows = (
            await db.execute(
                select(Vendor.id, Vendor.name).where(Vendor.id.in_(all_vendor_ids))
            )
        ).all()
        vendor_name_by_id = {r[0]: r[1] for r in vnd_rows}

    if not vehicles:
        return []

    trip_detail_rows = (
        await db.execute(
            select(
                DeliveredTrip.id,
                DeliveredTrip.vendor_id,
                DeliveredTrip.pickup_location_id,
                DeliveredTrip.dropoff_location_id,
                DeliveredTrip.work_type,
                DeliveredTrip.cont_type,
                DeliveredTrip.revenue,
                Vehicle.id,
            )
            .join(Vehicle, Vehicle.plate == DeliveredTrip.vehicle_plate)
            .where(
                DeliveredTrip.booked_trip_id.isnot(None),
                Vehicle.id.in_(list(vehicles.keys())),
                func.coalesce(
                    DeliveredTrip.trip_date, func.date(DeliveredTrip.created_at)
                )
                >= df,
                func.coalesce(
                    DeliveredTrip.trip_date, func.date(DeliveredTrip.created_at)
                )
                <= dt,
            )
        )
    ).all()

    vendor_trips = [
        TripPriceInfo(
            id=r[0],
            partner_id=r[1],
            pickup_location_id=r[2],
            dropoff_location_id=r[3],
            work_type=r[4],
            cont_type=r[5],
        )
        for r in trip_detail_rows
        if r[1] is not None
    ]
    vendor_prices = await lookup_vendor_prices(db, vendor_trips)

    revenue_by_vehicle: dict[int, int] = {}
    vendor_cost_by_vehicle: dict[int, int] = {}
    for r in trip_detail_rows:
        trip_id, vid, trip_rev = r[0], r[7], int(r[6] or 0)
        if vid:
            revenue_by_vehicle[vid] = revenue_by_vehicle.get(vid, 0) + trip_rev
            vendor_cost_by_vehicle[vid] = vendor_cost_by_vehicle.get(
                vid, 0
            ) + vendor_prices.get(trip_id, 0)

    wo_salary_rows = (
        await db.execute(
            select(
                Vehicle.id,
                func.coalesce(func.sum(DeliveredTrip.driver_salary), 0),
            )
            .join(Vehicle, Vehicle.plate == DeliveredTrip.vehicle_plate)
            .where(
                DeliveredTrip.booked_trip_id.isnot(None),
                Vehicle.id.in_(list(vehicles.keys())),
                func.coalesce(
                    DeliveredTrip.trip_date, func.date(DeliveredTrip.created_at)
                )
                >= df,
                func.coalesce(
                    DeliveredTrip.trip_date, func.date(DeliveredTrip.created_at)
                )
                <= dt,
            )
            .group_by(Vehicle.id)
        )
    ).all()
    salary_by_vehicle: dict[int, int] = {
        vid: int(sal or 0) for vid, sal in wo_salary_rows if vid
    }

    # Trip count per vehicle for ordering / context
    wo_count_rows = (
        await db.execute(
            select(Vehicle.id, func.count(DeliveredTrip.id))
            .join(Vehicle, Vehicle.plate == DeliveredTrip.vehicle_plate)
            .where(
                DeliveredTrip.booked_trip_id.isnot(None),
                Vehicle.id.in_(list(vehicles.keys())),
                func.coalesce(
                    DeliveredTrip.trip_date, func.date(DeliveredTrip.created_at)
                )
                >= df,
                func.coalesce(
                    DeliveredTrip.trip_date, func.date(DeliveredTrip.created_at)
                )
                <= dt,
            )
            .group_by(Vehicle.id)
        )
    ).all()
    {vid: int(cnt) for vid, cnt in wo_count_rows if vid}

    expense_rows = (
        await db.execute(
            select(
                VehicleExpense.vehicle_id,
                VehicleExpense.category,
                func.coalesce(func.sum(VehicleExpense.amount), 0),
            )
            .where(
                VehicleExpense.expense_date >= df,
                VehicleExpense.expense_date <= dt,
                VehicleExpense.category.in_(
                    ["XANG_DAU", "SUA_CHUA", "TIEN_LUAT", "KHAC"]
                ),
            )
            .group_by(VehicleExpense.vehicle_id, VehicleExpense.category)
        )
    ).all()
    cp_xe_by_vehicle: dict[int, dict[str, int]] = {}
    for vid, cat, total_amt in expense_rows:
        if vid and vid in vehicles:
            slot = cp_xe_by_vehicle.setdefault(
                vid, {"XANG_DAU": 0, "SUA_CHUA": 0, "TIEN_LUAT": 0, "KHAC": 0}
            )
            slot[cat] = slot.get(cat, 0) + int(total_amt or 0)

    vd_rows = (
        await db.execute(
            select(VehicleDriver.vehicle_id, VehicleDriver.driver_id).where(
                VehicleDriver.vehicle_id.in_(list(vehicles.keys())),
                VehicleDriver.is_active == True,  # noqa: E712
                VehicleDriver.effective_from <= dt,
            )
        )
    ).all()
    vehicle_driver_map: dict[int, list[int]] = {}
    for vid, did in vd_rows:
        vehicle_driver_map.setdefault(vid, []).append(did)

    all_driver_ids = list(
        {d for drivers in vehicle_driver_map.values() for d in drivers}
    )
    base_salary_repo = SqlDriverSalaryConfigRepository(db)
    history_by_driver = (
        await base_salary_repo.list_history_for_drivers(all_driver_ids)
        if all_driver_ids
        else {}
    )

    base_salary_by_vehicle: dict[int, int] = {
        vid: sum(
            effective_base_salary(history_by_driver.get(did, []), dt)
            for did in driver_ids
        )
        for vid, driver_ids in vehicle_driver_map.items()
    }

    rows: list[VehiclePnLRow] = []
    for vid, plate in sorted(vehicles.items(), key=lambda x: x[1]):
        rev = revenue_by_vehicle.get(vid, 0)
        sal = salary_by_vehicle.get(vid, 0)
        base = base_salary_by_vehicle.get(vid, 0)
        vcost = vendor_cost_by_vehicle.get(vid, 0)
        xe_cats = cp_xe_by_vehicle.get(vid, {})
        xe_summary = VehicleExpenseSummary(
            xang_dau=xe_cats.get("XANG_DAU", 0),
            sua_chua=xe_cats.get("SUA_CHUA", 0),
            tien_luat=xe_cats.get("TIEN_LUAT", 0),
            khac=xe_cats.get("KHAC", 0),
            total=sum(xe_cats.values()),
        )
        loi_nhuan = rev - (xe_summary.total + sal + base + vcost)
        vnd_id = vendor_id_by_vehicle.get(vid)
        rows.append(
            VehiclePnLRow(
                vehicle_id=vid,
                plate=plate,
                is_vendor=vnd_id is not None,
                vendor_name=vendor_name_by_id.get(vnd_id)
                if vnd_id is not None
                else None,
                revenue=rev,
                cp_xe=xe_summary,
                cp_luong_san_luong=sal,
                cp_luong_co_ban=base,
                cp_vendor=vcost,
                loi_nhuan=loi_nhuan,
            )
        )
    return rows


def _row_cost(row: VehiclePnLRow) -> int:
    return int(
        row.cp_xe.total + row.cp_luong_san_luong + row.cp_luong_co_ban + row.cp_vendor
    )
