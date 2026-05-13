#!/usr/bin/env python3
"""Database seed script.

Usage:
    cd backend
    python scripts/seed.py

Runs the full dev seed: users, vehicles, locations, partners,
pricings, and operational data (work/trip orders).
Idempotent — clears operational data on re-run, keeps reference data.
"""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

# Ensure backend root is on sys.path so `app.*` imports work
_BACKEND_ROOT = str(Path(__file__).resolve().parent.parent)
if _BACKEND_ROOT not in sys.path:
    sys.path.insert(0, _BACKEND_ROOT)


async def main() -> None:
    from app.seed_dev import seed_dev
    await seed_dev()


if __name__ == "__main__":
    print("🌱 Seeding database (dev mode)...\n")
    asyncio.run(main())
    print("\n✅ Done.")
