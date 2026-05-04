#!/usr/bin/env python3
"""Seed `locations` + `location_aliases` from customer order / tariff
sample files.

Reuses the import pipeline's preview (sheet picker → header finder →
column mapper → value parsers) to extract every distinct pickup /
dropoff string. Clusters fuzzy-similar strings (SequenceMatcher ≥ 0.85),
picks the longest variant as the canonical name, upserts:

  - one `locations` row per cluster (created_via='seed', pending_geocode=true)
  - one `location_aliases` row per non-canonical member (source='seed_confirmed')

Idempotent: existing locations + aliases (by normalized name) are
skipped on re-run.

Examples:
    # dev
    ./scripts/seeds/seed_locations_from_files.py --files docs/*.xlsx docs/*.xls

    # dev, dry-run
    ./scripts/seeds/seed_locations_from_files.py --files docs/*.xlsx --dry-run

    # droplet
    DATABASE_URL=postgresql://prod-host/db \\
        ./scripts/seeds/seed_locations_from_files.py \\
        --files /tmp/file1.xlsx --prod
"""

from __future__ import annotations

import argparse
import asyncio
import difflib
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


CLUSTER_THRESHOLD = 0.85


def parse_args(argv: list[str]) -> argparse.Namespace:
    p = argparse.ArgumentParser(
        prog="seed_locations_from_files",
        description="Extract distinct pickup/dropoff strings from sample files "
                    "and upsert as Locations + Aliases.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    add_files_arg(p, required=True)
    add_common_args(p)
    return p.parse_args(argv)


def _cluster(strings: list[str], normalize) -> list[list[str]]:
    """Greedy SequenceMatcher clustering on normalized forms."""
    by_norm: dict[str, str] = {}
    norm_strings: list[str] = []
    raw_to_norm: dict[str, str] = {}
    for s in strings:
        n = normalize(s)
        if not n:
            continue
        raw_to_norm[s] = n
        if n not in by_norm:
            by_norm[n] = s
            norm_strings.append(n)
    clusters_norm: list[list[str]] = []
    for n in norm_strings:
        placed = False
        for cluster in clusters_norm:
            best = max(difflib.SequenceMatcher(None, n, m).ratio() for m in cluster)
            if best >= CLUSTER_THRESHOLD:
                cluster.append(n)
                placed = True
                break
        if not placed:
            clusters_norm.append([n])
    out: list[list[str]] = []
    for cluster in clusters_norm:
        cluster_set = set(cluster)
        raws = sorted({raw for raw, n in raw_to_norm.items() if n in cluster_set})
        out.append(raws)
    return out


def _pick_canonical(cluster: list[str]) -> str:
    return max(cluster, key=lambda s: (len(s), s))


async def run(args: argparse.Namespace) -> int:
    log = configure_logging(args.log_level)
    db_url = assert_safe_target(args, log)

    files = filter_existing_files(args.files, log,
                                   allow_missing=args.allow_missing_files)
    if not files:
        log.error("No files to process.")
        return 2

    from sqlalchemy import select  # type: ignore
    from app.models.domain import Location, LocationAlias  # type: ignore
    from app.services.import_pipeline.pipeline import run_preview  # type: ignore
    from app.services.location_resolver import normalize  # type: ignore

    started = time.monotonic()

    # Step 1 — extract
    log.info("Step 1 — extract distinct pickup/dropoff strings")
    all_strings: set[str] = set()
    for fp in files:
        try:
            content = fp.read_bytes()
            res = await run_preview(content, fp.name, default_trip_date=date.today())
        except Exception as exc:
            log.warning("  [skip] %s: %s", fp.name, exc)
            continue
        per_file = set()
        for row in res.accepted:
            v = row.get("values") or {}
            for key in ("pickup_location", "dropoff_location"):
                s = (v.get(key) or "").strip()
                if s:
                    per_file.add(s)
        log.info("  %s — %d strings", fp.name, len(per_file))
        all_strings |= per_file
    log.info("  Total unique strings across %d file(s): %d", len(files), len(all_strings))

    # Step 2 — cluster
    clusters = _cluster(sorted(all_strings), normalize)
    log.info("Step 2 — clustered into %d group(s) (cluster threshold %.2f)",
             len(clusters), CLUSTER_THRESHOLD)

    # Step 3 — upsert
    log.info("Step 3 — upsert")
    locations_added = locations_existing = 0
    aliases_added = aliases_existing = 0
    review_clusters: list[tuple[str, list[str]]] = []

    async with open_session(db_url) as db:
        for cluster in clusters:
            canonical = _pick_canonical(cluster)
            canonical_norm = normalize(canonical)

            existing_loc = (await db.execute(
                select(Location).where(Location.name == canonical)
            )).scalar_one_or_none()
            if existing_loc is None:
                for raw in cluster:
                    rn = normalize(raw)
                    alias_row = (await db.execute(
                        select(LocationAlias).where(LocationAlias.alias_normalized == rn)
                    )).scalar_one_or_none()
                    if alias_row is not None:
                        existing_loc = await db.get(Location, alias_row.location_id)
                        break

            if existing_loc is None:
                if args.dry_run:
                    log.info("  [dry-run] +Location %r (cluster size %d)",
                             canonical, len(cluster))
                    locations_added += 1
                    continue
                existing_loc = Location(
                    name=canonical[:255], is_active=True,
                    pending_geocode=True, created_via="seed",
                    location_review_needed=False,
                )
                db.add(existing_loc)
                await db.flush()
                locations_added += 1
            else:
                locations_existing += 1

            for raw in cluster:
                rn = normalize(raw)
                if not rn or rn == canonical_norm:
                    continue
                already = (await db.execute(
                    select(LocationAlias).where(LocationAlias.alias_normalized == rn)
                )).scalar_one_or_none()
                if already is not None:
                    aliases_existing += 1
                    continue
                if args.dry_run:
                    log.info("  [dry-run]   +Alias %r → %s", raw, canonical)
                    aliases_added += 1
                    continue
                db.add(LocationAlias(
                    location_id=existing_loc.id,
                    alias=raw[:255], alias_normalized=rn,
                    source="seed_confirmed",
                ))
                aliases_added += 1

            if len(cluster) >= 4:
                review_clusters.append((canonical, cluster))

        if not args.dry_run:
            await db.commit()

    log.info("Done in %.2fs — locations: +%d, existing %d | aliases: +%d, existing %d",
             time.monotonic() - started,
             locations_added, locations_existing, aliases_added, aliases_existing)
    if review_clusters:
        log.info("Clusters worth a manual glance (size ≥ 4):")
        for canonical, members in review_clusters[:10]:
            log.info("  → %r", canonical)
            for m in members:
                if m != canonical:
                    log.info("       • %r", m)
    return 0


def main() -> int:
    return asyncio.run(run(parse_args(sys.argv[1:])))


if __name__ == "__main__":
    sys.exit(main())
