#!/usr/bin/env python3
"""Seed `routes` master rows by deriving distinct (pickup, dropoff)
tuples from sample files AND existing pricing_lines.

Routes in the schema are keyed by (pickup_location_id, dropoff_location_id);
work_type / cont type sits in the `type_20ft` and `type_40ft` price
columns on the same row. Sources scanned:

  - **Order sample files** — pickup/dropoff strings on each row form a
    candidate (pickup, dropoff) tuple. Read for routes only — does NOT
    insert any TripOrder.
  - **Pricing files (--pricing-files)** — same shape; `Pricing` table
    is also queried after to harvest tuples already present from the
    bảng giá seed.

The script resolves each pickup/dropoff string through
`LocationResolverService` (so it benefits from the alias table seeded
by `seed_locations_from_files.py`). New Locations are NOT created here
— that's the locations seeder's job. If a string can't be resolved,
the route is skipped with a clear log line.

Idempotent on (pickup_location_id, dropoff_location_id).

Examples:
    # dev — derive from order files + existing pricing rows
    ./scripts/seeds/seed_routes_from_files.py --files docs/*.xlsx docs/*.xls

    # dry-run, log all the (pickup, dropoff) candidates first
    ./scripts/seeds/seed_routes_from_files.py --files docs/*.xlsx --dry-run

    # droplet
    DATABASE_URL=postgresql://... \\
        ./scripts/seeds/seed_routes_from_files.py --files /tmp/*.xlsx --prod
"""

from __future__ import annotations

import argparse
import asyncio
import sys
import time
from datetime import date
from pathlib import Path

from _common import (
    add_common_args,
    add_files_arg,
    assert_safe_target,
    configure_logging,
    filter_existing_files,
    open_session,
)


def parse_args(argv: list[str]) -> argparse.Namespace:
    p = argparse.ArgumentParser(
        prog="seed_routes_from_files",
        description="Derive (pickup, dropoff) routes from order files + the "
                    "Pricing table. Insert as `routes` rows.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    add_files_arg(p, required=False)
    p.add_argument(
        "--from-pricing",
        action="store_true",
        default=True,
        help="Include distinct (pickup, dropoff) tuples from the existing "
             "pricings table (default on; pass --no-from-pricing to disable).",
    )
    p.add_argument(
        "--no-from-pricing",
        dest="from_pricing", action="store_false",
        help=argparse.SUPPRESS,
    )
    add_common_args(p)
    return p.parse_args(argv)


async def _pairs_from_files(files: list[Path], log) -> set[tuple[str, str]]:
    from app.contexts.operations.infrastructure.import_pipeline.pipeline import run_preview  # type: ignore
    out: set[tuple[str, str]] = set()
    for fp in files:
        try:
            content = fp.read_bytes()
            res = await run_preview(content, fp.name, default_trip_date=date.today())
        except Exception as exc:
            log.warning("  [skip] %s: %s", fp.name, exc)
            continue
        per_file: set[tuple[str, str]] = set()
        for row in res.accepted:
            v = row.get("values") or {}
            pickup = (v.get("pickup_location") or "").strip()
            dropoff = (v.get("dropoff_location") or "").strip()
            if pickup or dropoff:
                per_file.add((pickup, dropoff))
        log.info("  %s — %d distinct (pickup, dropoff) pairs", fp.name, len(per_file))
        out |= per_file
    return out


async def _pairs_from_pricing(db, log) -> set[tuple[int, int]]:
    """Return distinct (pickup_location_id, dropoff_location_id) pairs
    already present on the Pricing table."""
    from sqlalchemy import select  # type: ignore
    from app.models.domain import Pricing  # type: ignore
    res = await db.execute(
        select(Pricing.pickup_location_id, Pricing.dropoff_location_id)
        .where(Pricing.pickup_location_id.is_not(None))
        .where(Pricing.dropoff_location_id.is_not(None))
        .distinct()
    )
    pairs = {(p, d) for p, d in res.all() if p is not None and d is not None}
    log.info("  Existing pricings table — %d distinct (pickup_id, dropoff_id) pairs", len(pairs))
    return pairs


async def run(args: argparse.Namespace) -> int:
    log = configure_logging(args.log_level)
    db_url = assert_safe_target(args, log)

    from sqlalchemy import select  # type: ignore
    from app.models.domain import Location, Route  # type: ignore
    from app.contexts.customer_pricing.application.location_resolver import (  # type: ignore
        LocationResolverService, normalize,
    )

    files = filter_existing_files(args.files or [], log,
                                   allow_missing=args.allow_missing_files)
    started = time.monotonic()

    # Step 1 — collect candidate pairs from files (string form)
    string_pairs: set[tuple[str, str]] = set()
    if files:
        log.info("Step 1 — extract (pickup, dropoff) string pairs from %d file(s)", len(files))
        string_pairs = await _pairs_from_files(files, log)
        log.info("  Total distinct string pairs across files: %d", len(string_pairs))

    # Step 2 — resolve to (pickup_id, dropoff_id) using the existing
    # Location table + alias resolver. Skip pairs we can't resolve.
    routes_added = 0
    routes_existing = 0
    routes_skipped_unresolved = 0

    async with open_session(db_url) as db:
        resolver = LocationResolverService(db)
        id_pairs: set[tuple[int, int]] = set()

        for pickup, dropoff in string_pairs:
            if not pickup or not dropoff:
                routes_skipped_unresolved += 1
                continue
            p_match = await resolver.find_match(pickup)
            d_match = await resolver.find_match(dropoff)
            if p_match.location is None or d_match.location is None:
                log.debug("  unresolved pair: %r → %r", pickup, dropoff)
                routes_skipped_unresolved += 1
                continue
            id_pairs.add((p_match.location.id, d_match.location.id))

        log.info("Step 2 — resolved %d/%d pairs to (pickup_id, dropoff_id)",
                 len(id_pairs), len(string_pairs))

        if args.from_pricing:
            log.info("Step 3 — pull pairs already present on `pricings`")
            id_pairs |= await _pairs_from_pricing(db, log)

        log.info("Step 4 — upsert %d distinct route candidate(s)", len(id_pairs))
        for p_id, d_id in sorted(id_pairs):
            existing = (await db.execute(
                select(Route).where(
                    Route.pickup_location_id == p_id,
                    Route.dropoff_location_id == d_id,
                )
            )).scalar_one_or_none()
            if existing is not None:
                routes_existing += 1
                continue
            p_loc = await db.get(Location, p_id)
            d_loc = await db.get(Location, d_id)
            if p_loc is None or d_loc is None:
                continue  # FK mid-flight inconsistency
            label = f"{p_loc.name} → {d_loc.name}"
            if args.dry_run:
                log.info("  [dry-run] +Route %s", label)
                routes_added += 1
                continue
            db.add(Route(
                route=label,
                pickup_location_id=p_id,
                dropoff_location_id=d_id,
                is_active=True,
            ))
            routes_added += 1
            log.info("  [+] %s", label)

        if not args.dry_run:
            await db.commit()

    log.info("Done in %.2fs — routes: +%d, existing %d, unresolved-pairs %d",
             time.monotonic() - started,
             routes_added, routes_existing, routes_skipped_unresolved)
    return 0


def main() -> int:
    return asyncio.run(run(parse_args(sys.argv[1:])))


if __name__ == "__main__":
    sys.exit(main())
