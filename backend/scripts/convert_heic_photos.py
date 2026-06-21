"""Convert HEIC photos stored under a .jpg name to real JPEG, in place.

Some driver-app uploads — iOS gallery photos — were written to disk as HEIC
bytes under a ``.jpg`` filename (see ``photo_storage.save_base64_photo``).
nginx reports ``Content-Type: image/jpeg`` from the extension, but the bytes
are HEIC, which Chrome/Firefox/Edge/Android cannot decode → broken images on
the website. This script finds those files by their HEIF magic bytes and
re-encodes each to JPEG.

The conversion is *in place*: the path and ``.jpg`` name are unchanged, so
existing ``delivered_trips.cont_photo_url`` values keep resolving. A one-time
``.bak`` copy of the original HEIC bytes is kept next to each converted file
(pass ``--no-backup`` to skip). For every converted file we also rewrite
``cont_photo_hash`` to the sha256 of the new JPEG bytes, so duplicate-trip
detection (which hashes the stored file) stays consistent.

Idempotent: re-running skips files that are already real JPEG.

Usage (run from the backend app's working directory so ./data/photos resolves
the same way the app sees it — typically inside the backend container):

    PYTHONPATH=. python scripts/convert_heic_photos.py             # live run
    PYTHONPATH=. python scripts/convert_heic_photos.py --dry-run   # report only
    PYTHONPATH=. python scripts/convert_heic_photos.py --limit 5   # convert first 5 HEIC
    PYTHONPATH=. python scripts/convert_heic_photos.py --no-backup # don't write .bak
"""

from __future__ import annotations

import argparse
import asyncio
import logging
from pathlib import Path

from sqlalchemy import update

from app.config import settings
from app.database import get_session
from app.models.domain import DeliveredTrip as DeliveredTripORM
from app.contexts.operations.infrastructure.photo_storage import (
    hash_image_bytes,
    is_heic,
    transcode_heic_to_jpeg,
)

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
log = logging.getLogger("convert_heic_photos")

PHOTOS_URL_PREFIX = "/photos/"


def path_to_url(storage_root: Path, path: Path) -> str:
    """Map an on-disk photo file to its served URL (/photos/<rel>)."""
    rel = path.relative_to(storage_root).as_posix()
    return f"{PHOTOS_URL_PREFIX}{rel}"


async def convert_all(*, dry_run: bool, limit: int | None, backup: bool) -> None:
    storage_root = Path(settings.PHOTO_STORAGE_ROOT)
    log.info("PHOTO_STORAGE_ROOT=%s resolved=%s", storage_root, storage_root.resolve())
    log.info(
        "mode=%s limit=%s backup=%s",
        "DRY-RUN" if dry_run else "LIVE",
        limit,
        backup,
    )

    candidates = sorted(storage_root.rglob("*.jpg"))
    log.info("candidate .jpg files: %d", len(candidates))

    scanned_heic = 0
    converted = 0
    failed = 0
    updates: list[tuple[str, str]] = []  # (cont_photo_url, new sha256)

    for path in candidates:
        try:
            raw = path.read_bytes()
        except OSError as exc:
            failed += 1
            log.warning("unreadable %s: %s: %s", path, type(exc).__name__, exc)
            continue

        if not is_heic(raw):
            continue  # already real JPEG (or other) — leave untouched

        scanned_heic += 1
        if limit is not None and scanned_heic > limit:
            log.info("reached --limit %d; stopping", limit)
            break

        try:
            jpeg = transcode_heic_to_jpeg(raw)
        except Exception as exc:  # noqa: BLE001 — corrupt HEIC, libheif error, …
            failed += 1
            log.warning(
                "convert FAILED %s: %s: %s (left untouched)", path, type(exc).__name__, exc
            )
            continue

        url = path_to_url(storage_root, path)
        new_hash = hash_image_bytes(jpeg)
        log.info(
            "HEIC->JPEG %s (%d -> %d bytes)",
            path.relative_to(storage_root),
            len(raw),
            len(jpeg),
        )

        if dry_run:
            converted += 1
            continue

        if backup:
            bak = path.with_suffix(path.suffix + ".bak")
            if not bak.exists():  # never clobber an existing backup
                bak.write_bytes(raw)

        path.write_bytes(jpeg)
        updates.append((url, new_hash))
        converted += 1

    # Keep duplicate-detection hashes consistent with the new JPEG bytes.
    if not dry_run and updates:
        async with get_session() as db:
            for url, digest in updates:
                await db.execute(
                    update(DeliveredTripORM)
                    .where(DeliveredTripORM.cont_photo_url == url)
                    .values(cont_photo_hash=digest)
                )
            await db.commit()
        log.info("updated cont_photo_hash for %d trip(s)", len(updates))

    log.info(
        "done: heic_found=%d converted=%d failed=%d mode=%s",
        scanned_heic,
        converted,
        failed,
        "DRY-RUN" if dry_run else "LIVE",
    )


def main() -> None:
    ap = argparse.ArgumentParser(
        description=__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    ap.add_argument(
        "--dry-run", action="store_true", help="report counts only, write nothing"
    )
    ap.add_argument(
        "--limit", type=int, default=None, help="max HEIC files to convert (default: all)"
    )
    ap.add_argument(
        "--no-backup",
        dest="backup",
        action="store_false",
        help="don't write a .bak copy of the original HEIC bytes",
    )
    ap.set_defaults(backup=True)
    args = ap.parse_args()
    asyncio.run(
        convert_all(dry_run=args.dry_run, limit=args.limit, backup=args.backup)
    )


if __name__ == "__main__":
    main()
