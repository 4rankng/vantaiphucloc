"""Seed demo operational data: work orders, trip orders, and containers.

Creates realistic data for May 2026 using existing reference data
(locations, partners, pricings).

Usage:
    python -m app.seed_demo
"""

import asyncio
import random
from datetime import date, timedelta

from sqlalchemy import text

from app.database import async_session

CONTAINER_PREFIXES = ["MSCU", "TCNU", "CMAU", "OOLU", "HLXU", "TGHU", "BMOU", "EISU"]


def _rand_container() -> str:
    return f"{random.choice(CONTAINER_PREFIXES)}{random.randint(1000000, 9999999)}"


def _rand_date_within(days_back: int = 14) -> date:
    base = date(2026, 5, 8)
    return base - timedelta(days=random.randint(0, days_back))


async def seed_demo() -> None:
    async with async_session() as db:
        # ── Gather reference data ─────────────────────────────────────────
        drivers = (await db.execute(
            text("SELECT id FROM users WHERE role = 'driver'")
        )).scalars().all()
        if not drivers:
            print("No drivers found — run app.seed first.")
            return

        vehicles = (await db.execute(
            text("SELECT id, driver_id FROM vehicles WHERE is_active = true")
        )).fetchall()
        vehicle_by_driver: dict[int, int] = {v.driver_id: v.id for v in vehicles}

        # Get pricings with their pricing_lines joined
        result = await db.execute(text("""
            SELECT pr.id, pr.partner_id, pr.work_type,
                   pr.pickup_location_id, pr.dropoff_location_id,
                   pl.unit_price, pl.driver_salary, pl.allowance
            FROM pricings pr
            JOIN pricing_lines pl ON pr.id = pl.pricing_id
        """))
        pricing_rows = result.fetchall()

        if not pricing_rows:
            print("No pricings found — import pricing data first.")
            return

        # ── Check if demo data already exists ─────────────────────────────
        existing_wo = (await db.execute(
            text("SELECT count(*) FROM work_orders")
        )).scalar()
        existing_to = (await db.execute(
            text("SELECT count(*) FROM trip_orders")
        )).scalar()
        if existing_wo > 0 or existing_to > 0:
            print(f"Demo data already exists ({existing_wo} WOs, {existing_to} TOs) — truncating...")
            await db.execute(text("DELETE FROM reconciliations"))
            await db.execute(text("DELETE FROM trip_order_containers"))
            await db.execute(text("DELETE FROM trip_orders"))
            await db.execute(text("DELETE FROM work_order_containers"))
            await db.execute(text("DELETE FROM work_orders"))
            await db.commit()
            print("Cleared existing demo data.")

        # ── Create Work Orders ────────────────────────────────────────────
        from app.models.domain import WorkOrder, WorkOrderContainer

        wo_count = 40
        work_orders = []
        for i in range(wo_count):
            pr = random.choice(pricing_rows)
            driver_id = random.choice(drivers)
            vehicle_id = vehicle_by_driver.get(driver_id)

            # Status: 50% PENDING, 50% MATCHED
            status = "PENDING" if random.random() < 0.5 else "MATCHED"

            wo = WorkOrder(
                partner_id=pr.partner_id,
                code=f"W{1001 + i:06d}",
                pickup_location_id=pr.pickup_location_id,
                dropoff_location_id=pr.dropoff_location_id,
                driver_id=driver_id,
                vehicle_id=vehicle_id,
                unit_price=pr.unit_price,
                driver_salary=pr.driver_salary,
                allowance=pr.allowance,
                pricing_id=pr.id,
                status=status,
            )
            db.add(wo)
            work_orders.append(wo)

        await db.flush()
        print(f"Created {wo_count} work orders")

        # ── Create WorkOrderContainers ────────────────────────────────────
        for wo in work_orders:
            await db.refresh(wo)
            n_containers = random.randint(1, 2)
            pr_row = next(p for p in pricing_rows if p.id == wo.pricing_id)
            for _ in range(n_containers):
                woc = WorkOrderContainer(
                    work_order_id=wo.id,
                    container_number=_rand_container(),
                    work_type=pr_row.work_type,
                )
                db.add(woc)

        await db.flush()
        print("Created work order containers")

        # ── Create Trip Orders ────────────────────────────────────────────
        from app.models.domain import TripOrder, TripOrderContainer

        to_count = 35
        trip_orders = []
        for i in range(to_count):
            pr = random.choice(pricing_rows)
            trip_date = _rand_date_within(20)

            # Status: 50% PENDING, 50% MATCHED
            status = "PENDING" if random.random() < 0.5 else "MATCHED"

            to = TripOrder(
                trip_date=trip_date,
                partner_id=pr.partner_id,
                code=f"T{2001 + i:06d}",
                pickup_location_id=pr.pickup_location_id,
                dropoff_location_id=pr.dropoff_location_id,
                pricing_id=pr.id,
                unit_price=pr.unit_price,
                driver_salary=pr.driver_salary,
                allowance=pr.allowance,
                status=status,
            )
            db.add(to)
            trip_orders.append(to)

        await db.flush()
        print(f"Created {to_count} trip orders")

        # ── Create TripOrderContainers ────────────────────────────────────
        for to in trip_orders:
            await db.refresh(to)
            pr_row = next(p for p in pricing_rows if p.id == to.pricing_id)
            n_containers = random.randint(1, 2)
            for _ in range(n_containers):
                toc = TripOrderContainer(
                    trip_order_id=to.id,
                    container_number=_rand_container(),
                    work_type=pr_row.work_type,
                    container_size=pr_row.work_type[1:],
                    freight_kind=pr_row.work_type[0],
                )
                db.add(toc)

        await db.flush()
        print("Created trip order containers")

        # ── Commit ────────────────────────────────────────────────────────
        await db.commit()

        # ── Summary ───────────────────────────────────────────────────────
        tables = [
            "work_orders", "work_order_containers",
            "trip_orders", "trip_order_containers",
        ]
        print("\n--- Demo data summary ---")
        for t in tables:
            cnt = (await db.execute(text(f"SELECT count(*) FROM {t}"))).scalar()
            print(f"  {t}: {cnt}")


if __name__ == "__main__":
    asyncio.run(seed_demo())
