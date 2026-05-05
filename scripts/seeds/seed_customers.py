#!/usr/bin/env python3
"""Seed customer (`clients`) master rows.

Two modes:

  1. Default — insert a known set of customer codes referenced by the
     sample files in `docs/`:
         HAIAN, PAN, HAP, NEWWAY

  2. `--from-files` — also scan the supplied Excel files for
     consignee / shipper / khách hàng values and seed any new ones.
     Source columns recognized by the import pipeline's canonical
     schema: `consignee` and adjacent values.

Idempotent: existing rows by `code` are skipped.

Examples:
    # default 4 customers
    ./scripts/seeds/seed_customers.py

    # extract from sample files too
    ./scripts/seeds/seed_customers.py --from-files docs/*.xlsx docs/*.xls

    # against droplet
    DATABASE_URL=postgresql://... ./scripts/seeds/seed_customers.py --prod

Customers are master data — safe to re-run anytime.
"""

from __future__ import annotations

import argparse
import asyncio
import re
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


# Default master entries from the order + tariff files in docs/.
DEFAULT_CUSTOMERS: list[dict[str, str]] = [
    {"code": "HAIAN",  "name": "Công ty TNHH HẢI AN"},
    {"code": "PAN",    "name": "Công ty TNHH PAN HẢI AN"},
    {"code": "HAP",    "name": "Công ty TNHH HAP"},
    {"code": "NEWWAY", "name": "Công ty TNHH NEWWAY"},
]


def parse_args(argv: list[str]) -> argparse.Namespace:
    p = argparse.ArgumentParser(
        prog="seed_customers",
        description=(
            "Idempotently insert customer (clients) master rows. "
            "Default seeds the 4 customers referenced in docs/."
        ),
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    p.add_argument(
        "--customers",
        nargs="+",
        metavar="CODE",
        help="Customer codes to seed. If omitted, seeds the default set "
             f"({', '.join(c['code'] for c in DEFAULT_CUSTOMERS)}).",
    )
    p.add_argument(
        "--from-files",
        action="store_true",
        help="Also scan --files for consignee/shipper values and seed any "
             "new customer codes encountered.",
    )
    add_files_arg(p, required=False)
    add_common_args(p)
    return p.parse_args(argv)


def _slugify_code(name: str) -> str:
    """Turn a free-form consignee name like 'ONE LINE' or 'PAN HẢI AN'
    into a uppercase code suitable for `clients.code`."""
    if not name:
        return ""
    name = re.sub(r"[^A-Za-z0-9 ]", "", name).strip()
    parts = name.split()
    if not parts:
        return ""
    if len(parts) == 1:
        return parts[0].upper()[:20]
    return "".join(p[0].upper() for p in parts)[:20]


async def _scan_files_for_consignees(files: list[Path], log) -> list[dict[str, str]]:
    """Run the import pipeline preview on each file and collect distinct
    consignee/shipper values. Returns [{code, name}, ...]."""
    from app.contexts.operations.infrastructure.import_pipeline.pipeline import run_preview  # type: ignore

    seen: dict[str, str] = {}  # code -> name
    for fp in files:
        try:
            content = fp.read_bytes()
            res = await run_preview(content, fp.name, default_trip_date=date.today())
        except Exception as exc:
            log.warning("[skip] %s: %s", fp.name, exc)
            continue
        for row in res.accepted:
            v = row.get("values") or {}
            for key in ("consignee", "client_hint"):
                name = (v.get(key) or "").strip()
                if not name or len(name) > 100:
                    continue
                code = _slugify_code(name)
                if not code or code in seen:
                    continue
                seen[code] = name
    out = [{"code": c, "name": n} for c, n in seen.items()]
    log.info("Scanned %d file(s) → %d distinct consignees/shippers", len(files), len(out))
    return out


async def run(args: argparse.Namespace) -> int:
    log = configure_logging(args.log_level)
    db_url = assert_safe_target(args, log)

    from sqlalchemy import select  # type: ignore
    from app.models.domain import Client  # type: ignore

    # Build the target list
    if args.customers:
        wanted = {c.upper() for c in args.customers}
        targets = [c for c in DEFAULT_CUSTOMERS if c["code"] in wanted] + [
            {"code": code, "name": code}
            for code in wanted
            if code not in {c["code"] for c in DEFAULT_CUSTOMERS}
        ]
    else:
        targets = list(DEFAULT_CUSTOMERS)

    if args.from_files:
        files = filter_existing_files(args.files or [], log,
                                       allow_missing=args.allow_missing_files)
        if files:
            extra = await _scan_files_for_consignees(files, log)
            existing_codes = {t["code"] for t in targets}
            for e in extra:
                if e["code"] not in existing_codes:
                    targets.append(e)
                    existing_codes.add(e["code"])

    log.info("Seeding %d customer master row(s): %s",
             len(targets), ", ".join(t["code"] for t in targets))

    added = 0
    skipped = 0
    started = time.monotonic()
    async with open_session(db_url) as db:
        for t in targets:
            existing = (await db.execute(
                select(Client).where(Client.code == t["code"])
            )).scalar_one_or_none()
            if existing is not None:
                skipped += 1
                log.info("  [exists] %s (id=%s)", t["code"], existing.id)
                continue
            if args.dry_run:
                added += 1
                log.info("  [dry-run] would INSERT clients(code=%s, name=%r)",
                         t["code"], t["name"])
                continue
            db.add(Client(
                code=t["code"], name=t["name"], type="company",
                phone="", outstanding_debt=0, is_active=True,
            ))
            added += 1
            log.info("  [+] inserted %s — %s", t["code"], t["name"])
        if not args.dry_run:
            await db.commit()

    log.info("Done in %.2fs — added=%d, skipped_existing=%d",
             time.monotonic() - started, added, skipped)
    return 0


def main() -> int:
    return asyncio.run(run(parse_args(sys.argv[1:])))


if __name__ == "__main__":
    sys.exit(main())
