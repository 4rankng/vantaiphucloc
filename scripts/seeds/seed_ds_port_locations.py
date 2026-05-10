#!/usr/bin/env python3
"""Seed canonical Hai Phong port locations from DS PORT.xlsx.

Creates one Location per row (created_via='ds_port_seed'), with each
name also recorded as a CONFIRMED alias.  Idempotent on re-run.

Usage:
    ./scripts/seeds/seed_ds_port_locations.py
    ./scripts/seeds/seed_ds_port_locations.py --dry-run
"""

from __future__ import annotations

import argparse
import asyncio
import sys
from pathlib import Path

import openpyxl


REPO_ROOT = Path(__file__).resolve().parent.parent.parent
DEFAULT_FILE = REPO_ROOT / "docs" / "DS PORT.xlsx"


def parse_args(argv: list[str]) -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Load DS PORT.xlsx locations")
    p.add_argument("--file", type=Path, default=DEFAULT_FILE, help="Path to DS PORT.xlsx")
    p.add_argument("--dry-run", action="store_true")
    p.add_argument("--db-url", type=str, default=None, help="Override DATABASE_URL")
    return p.parse_args(argv)


def _read_port_names(path: Path) -> list[str]:
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    ws = wb.active
    names: list[str] = []
    for row in ws.iter_rows(min_row=1, values_only=True):
        for cell in row:
            if cell is not None:
                val = str(cell).strip()
                if val:
                    names.append(val)
    wb.close()
    # deduplicate while preserving order
    seen: set[str] = set()
    unique: list[str] = []
    for n in names:
        nl = n.lower()
        if nl not in seen:
            seen.add(nl)
            unique.append(n)
    return unique


async def run(args: argparse.Namespace) -> int:
    if not args.file.exists():
        print(f"File not found: {args.file}", file=sys.stderr)
        return 1

    names = _read_port_names(args.file)
    print(f"Found {len(names)} location(s) in {args.file.name}")

    # Set up DB
    import os
    db_url = args.db_url or os.environ.get("DATABASE_URL")
    if not db_url:
        db_url = "postgresql+asyncpg://ttransport:ttransport@localhost:5432/ttransport"

    from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
    from sqlalchemy import select
    from app.models.domain import Location, LocationAlias
    from app.contexts.customer_pricing.infrastructure.location_resolver import normalize

    engine = create_async_engine(db_url)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    locations_added = 0
    locations_existing = 0
    aliases_added = 0

    async with session_factory() as db:
        for name in names:
            norm = normalize(name)

            # Check existing location by name
            existing = (await db.execute(
                select(Location).where(Location.name == name)
            )).scalar_one_or_none()

            if existing is None:
                # Check by alias
                alias_row = (await db.execute(
                    select(LocationAlias).where(LocationAlias.alias_normalized == norm)
                )).scalar_one_or_none()
                if alias_row is not None:
                    existing = await db.get(Location, alias_row.location_id)

            if existing is None:
                if args.dry_run:
                    print(f"  +Location: {name}")
                    locations_added += 1
                    continue
                existing = Location(
                    name=name[:255],
                    is_active=True,
                    pending_geocode=True,
                    created_via="ds_port_seed",
                    location_review_needed=False,
                )
                db.add(existing)
                await db.flush()
                locations_added += 1
            else:
                locations_existing += 1

            # Add self-referencing confirmed alias (for future exact-match)
            existing_norm = normalize(existing.name)
            if norm != existing_norm:
                already = (await db.execute(
                    select(LocationAlias).where(LocationAlias.alias_normalized == norm)
                )).scalar_one_or_none()
                if already is None:
                    if args.dry_run:
                        aliases_added += 1
                        continue
                    db.add(LocationAlias(
                        location_id=existing.id,
                        alias=name[:255],
                        alias_normalized=norm,
                        source="ds_port_seed",
                        status="CONFIRMED",
                    ))
                    aliases_added += 1

        if not args.dry_run:
            await db.commit()

    await engine.dispose()

    print(f"Done — locations: +{locations_added}, existing: {locations_existing}, aliases: +{aliases_added}")
    return 0


def main() -> int:
    return asyncio.run(run(parse_args(sys.argv[1:])))


if __name__ == "__main__":
    sys.exit(main())
