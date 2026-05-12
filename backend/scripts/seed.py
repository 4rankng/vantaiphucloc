#!/usr/bin/env python3
"""Consolidated database seed script.

Usage:
    cd backend
    python scripts/seed.py              # dev mode (default)
    python scripts/seed.py --mode demo  # demo operational data only
    python scripts/seed.py --mode client-data  # backfill partner contact info

Modes:
    dev          — Full dev seed: users, vehicles, locations, partners,
                   pricings, and operational data (work/trip orders).
                   Replaces the old seed_dev.py.
    users        — Seed users + salary settings only (old seed.py).
    demo         — Seed demo operational data only (old seed_demo.py).
                   Requires existing reference data.
    client-data  — Backfill partner contact info (old seed_client_data.py).
"""

from __future__ import annotations

import argparse
import asyncio
import importlib
import sys
from pathlib import Path

# Ensure backend root is on sys.path so `app.*` imports work
_BACKEND_ROOT = str(Path(__file__).resolve().parent.parent)
if _BACKEND_ROOT not in sys.path:
    sys.path.insert(0, _BACKEND_ROOT)


async def run_users() -> None:
    from app.seed import seed_users, seed_settings
    await seed_users()
    await seed_settings()


async def run_dev() -> None:
    from app.seed_dev import seed_dev
    await seed_dev()


async def run_demo() -> None:
    from app.seed_demo import seed_demo
    await seed_demo()


async def run_client_data() -> None:
    from app.seed_client_data import seed_client_data
    await seed_client_data()


MODES = {
    "users": run_users,
    "dev": run_dev,
    "demo": run_demo,
    "client-data": run_client_data,
}


def main() -> None:
    parser = argparse.ArgumentParser(description="TTransport database seeder")
    parser.add_argument(
        "--mode", "-m",
        choices=list(MODES.keys()),
        default="dev",
        help="Seed mode (default: dev)",
    )
    args = parser.parse_args()
    print(f"🌱 Seeding database in '{args.mode}' mode...\n")
    asyncio.run(MODES[args.mode]())
    print("\n✅ Done.")


if __name__ == "__main__":
    main()
