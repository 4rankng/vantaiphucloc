"""Seed demo operational data: work orders, trip orders, and link them.

Creates realistic data for May 2026 using existing reference data
(locations, clients, vendors, routes, pricings).

Usage:
    python -m app.seed_demo
"""

import asyncio
import random
from datetime import date, timedelta, timezone
from datetime import datetime as dt

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import async_session
from app.models.domain import (
    Client,
    Pricing,
    PricingLine,
    Route,
    TripOrder,
    TripOrderContainer,
    TripOrderWorkOrder,
    WorkOrder,
    WorkOrderContainer,
)

PLATES = ["29C-12345", "29C-23456", "29C-34567", "29C-45678", "29C-56789"]
CONTAINER_PREFIXES = ["MSCU", "TCNU", "CMAU", "OOLU", "HLXU", "TGHU", "BMOU", "EISU"]
WORK_TYPES = ["E20", "E40", "F20", "F40"]


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

        # Get pricings with their pricing_lines joined
        result = await db.execute(text("""
            SELECT pr.id, pr.client_id, pr.work_type,
                   pr.pickup_location_id, pr.dropoff_location_id,
                   pl.unit_price, pl.driver_salary, pl.allowance
            FROM pricings pr
            JOIN pricing_lines pl ON pr.id = pl.pricing_id
        """))
        pricing_rows = result.fetchall()

        if not pricing_rows:
            print("No pricings found — import pricing data first.")
            return

        # Get route names for readable route strings
        result = await db.execute(text("""
            SELECT r.pickup_location_id, r.dropoff_location_id,
                   p.name AS pickup, d.name AS dropoff
            FROM routes r
            JOIN locations p ON r.pickup_location_id = p.id
            JOIN locations d ON r.dropoff_location_id = d.id
        """))
        route_map = {
            (r.pickup_location_id, r.dropoff_location_id): f"{r.pickup} → {r.dropoff}"
            for r in result.fetchall()
        }

        # ── Check if demo data already exists ─────────────────────────────
        existing_wo = (await db.execute(
            text("SELECT count(*) FROM work_orders")
        )).scalar()
        existing_to = (await db.execute(
            text("SELECT count(*) FROM trip_orders")
        )).scalar()
        if existing_wo > 0 or existing_to > 0:
            print(f"Demo data already exists ({existing_wo} WOs, {existing_to} TOs) — truncating...")
            await db.execute(text("DELETE FROM trip_order_work_orders"))
            await db.execute(text("DELETE FROM trip_order_containers"))
            await db.execute(text("DELETE FROM trip_orders"))
            await db.execute(text("DELETE FROM work_order_containers"))
            await db.execute(text("DELETE FROM work_orders"))
            await db.commit()
            print("Cleared existing demo data.")

        # ── Create Work Orders ────────────────────────────────────────────
        wo_count = 40
        work_orders = []
        for i in range(wo_count):
            pr = random.choice(pricing_rows)
            driver_id = random.choice(drivers)
            route_str = route_map.get(
                (pr.pickup_location_id, pr.dropoff_location_id),
                "Unknown route"
            )

            # Spread statuses: 40% PENDING, 40% MATCHED, 20% COMPLETED
            r = random.random()
            if r < 0.4:
                status = "PENDING"
            elif r < 0.8:
                status = "MATCHED"
            else:
                status = "COMPLETED"

            wo = WorkOrder(
                client_id=pr.client_id,
                code=f"W{1001 + i:06d}",
                route=route_str,
                pickup_location_id=pr.pickup_location_id,
                dropoff_location_id=pr.dropoff_location_id,
                driver_id=driver_id,
                tractor_plate=random.choice(PLATES),
                unit_price=pr.unit_price,
                driver_salary=pr.driver_salary,
                allowance=pr.allowance,
                earning=pr.driver_salary + pr.allowance,
                pricing_id=pr.id,
                status=status,
            )
            db.add(wo)
            work_orders.append(wo)

        await db.flush()
        print(f"Created {wo_count} work orders")

        # ── Create WorkOrderContainers ────────────────────────────────────
        for wo in work_orders:
            # Refresh to get the id
            await db.refresh(wo)
            n_containers = random.randint(1, 2)
            # Get the work_type from the pricing
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
        to_count = 35
        trip_orders = []
        for i in range(to_count):
            pr = random.choice(pricing_rows)
            route_str = route_map.get(
                (pr.pickup_location_id, pr.dropoff_location_id),
                "Unknown route"
            )
            trip_date = _rand_date_within(20)
            revenue = pr.unit_price

            # Status spread: 30% DRAFT, 30% PENDING, 30% COMPLETED, 10% CANCELLED
            r = random.random()
            is_confirmed = False
            if r < 0.3:
                status = "DRAFT"
            elif r < 0.6:
                status = "PENDING"
            elif r < 0.9:
                status = "COMPLETED"
                is_confirmed = random.random() < 0.7
            else:
                status = "CANCELLED"

            to = TripOrder(
                trip_date=trip_date,
                client_id=pr.client_id,
                code=f"T{2001 + i:06d}",
                route=route_str,
                pickup_location_id=pr.pickup_location_id,
                dropoff_location_id=pr.dropoff_location_id,
                pricing_id=pr.id,
                unit_price=pr.unit_price,
                driver_salary=pr.driver_salary,
                allowance=pr.allowance,
                revenue=revenue,
                status=status,
                is_confirmed=is_confirmed,
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

        # ── Link matched trip orders to work orders ───────────────────────
        matched_tos = [to for to in trip_orders if to.status == "COMPLETED"]
        matched_wos = [wo for wo in work_orders if wo.status in ("MATCHED", "COMPLETED")]

        link_count = 0
        for to in matched_tos:
            # Link 1-2 work orders per trip
            n_links = min(random.randint(1, 2), len(matched_wos))
            chosen = random.sample(matched_wos, n_links)
            for wo in chosen:
                tow = TripOrderWorkOrder(
                    trip_order_id=to.id,
                    work_order_id=wo.id,
                )
                db.add(tow)
                link_count += 1

        await db.flush()
        print(f"Created {link_count} trip-order ↔ work-order links")

        # ── Commit ────────────────────────────────────────────────────────
        await db.commit()

        # ── Summary ───────────────────────────────────────────────────────
        tables = [
            "work_orders", "work_order_containers",
            "trip_orders", "trip_order_containers",
            "trip_order_work_orders",
        ]
        print("\n--- Demo data summary ---")
        for t in tables:
            cnt = (await db.execute(text(f"SELECT count(*) FROM {t}"))).scalar()
            print(f"  {t}: {cnt}")


if __name__ == "__main__":
    asyncio.run(seed_demo())
