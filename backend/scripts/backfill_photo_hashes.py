"""Backfill delivered_trips.cont_photo_hash from existing photo files.

Run AFTER the 0012_add_cont_photo_hash migration. Idempotent: rows that
already have a hash are skipped, so re-running is safe and never overwrites.

The duplicate-trip warning can only match against photos whose hash is
stored. New driver-app trips get a hash automatically at upload time
(`save_base64_photo`), but trips created before the feature shipped have
NULL cont_photo_hash. This script fills those in by re-hashing the photo
file on disk — it only ever writes rows whose hash is still NULL.

Usage (run from the backend app's working directory so ./data/photos
resolves the same way the app sees it):

    PYTHONPATH=. python scripts/backfill_photo_hashes.py             # live run
    PYTHONPATH=. python scripts/backfill_photo_hashes.py --dry-run   # report only
    PYTHONPATH=. python scripts/backfill_photo_hashes.py --limit 50  # cap rows
    PYTHONPATH=. python scripts/backfill_photo_hashes.py --batch 100 # commit cadence
"""

from __future__ import annotations

import argparse
import asyncio
import hashlib
import logging
from pathlib import Path

from sqlalchemy import select, update

from app.config import settings
from app.database import get_session
from app.models.domain import DeliveredTrip as DeliveredTripORM

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
log = logging.getLogger("backfill_photo_hashes")

PHOTOS_URL_PREFIX = "/photos/"


def url_to_path(photo_url: str) -> Path:
    """Map a served photo URL (/photos/YYYY/MM/DD/<uuid>.jpg) to its file
    on disk under PHOTO_STORAGE_ROOT."""
    if photo_url.startswith(PHOTOS_URL_PREFIX):
        rel = photo_url[len(PHOTOS_URL_PREFIX):]
    else:
        rel = photo_url.lstrip("/")
    return Path(settings.PHOTO_STORAGE_ROOT) / rel


def sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


async def backfill(*, dry_run: bool, limit: int | None, batch: int) -> None:
    storage_root = Path(settings.PHOTO_STORAGE_ROOT)
    log.info("PHOTO_STORAGE_ROOT=%s resolved=%s", storage_root, storage_root.resolve())
    log.info("mode=%s limit=%s batch=%d", "DRY-RUN" if dry_run else "LIVE", limit, batch)

    async with get_session() as db:
        q = (
            select(DeliveredTripORM.id, DeliveredTripORM.cont_photo_url)
            .where(
                DeliveredTripORM.cont_photo_url.isnot(None),
                DeliveredTripORM.cont_photo_url != "",
                DeliveredTripORM.cont_photo_hash.is_(None),
            )
            .order_by(DeliveredTripORM.id)
        )
        if limit:
            q = q.limit(limit)
        rows = (await db.execute(q)).all()

        total = len(rows)
        log.info("rows needing backfill: %d", total)

        hashed = 0
        missing = 0
        for i, (trip_id, photo_url) in enumerate(rows, start=1):
            path = url_to_path(photo_url)
            if not path.is_file():
                missing += 1
                log.warning("missing file trip=%s url=%s -> %s", trip_id, photo_url, path)
                continue
            try:
                digest = sha256_file(path)
            except OSError as exc:
                missing += 1
                log.warning("unreadable file trip=%s path=%s: %s: %s", trip_id, path, type(exc).__name__, exc)
                continue

            if not dry_run:
                await db.execute(
                    update(DeliveredTripORM)
                    .where(DeliveredTripORM.id == trip_id)
                    .values(cont_photo_hash=digest)
                )
                hashed += 1
                if hashed % batch == 0:
                    await db.commit()
                    log.info("  committed %d/%d ...", hashed, total)
            else:
                hashed += 1

            if i % 500 == 0:
                log.info("  scanned %d/%d (hashed=%d missing=%d)", i, total, hashed, missing)

        if not dry_run:
            await db.commit()

        log.info(
            "done: hashed=%d missing=%d total=%d mode=%s",
            hashed, missing, total, "DRY-RUN" if dry_run else "LIVE",
        )


def main() -> None:
    ap = argparse.ArgumentParser(
        description=__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    ap.add_argument("--dry-run", action="store_true", help="report counts only, write nothing")
    ap.add_argument("--limit", type=int, default=None, help="max rows to process (default: all)")
    ap.add_argument("--batch", type=int, default=200, help="commit every N writes (default: 200)")
    args = ap.parse_args()
    asyncio.run(backfill(dry_run=args.dry_run, limit=args.limit, batch=args.batch))


if __name__ == "__main__":
    main()
