"""Shared helpers for the seed CLI scripts.

These scripts live OUTSIDE the deployable backend/ tree on purpose — see
`scripts/seeds/README.md`. They import from `backend/app/*` for models +
DB session setup but are NOT themselves bundled into the Docker image.

The `_bootstrap_path()` call at module load time inserts
`<repo_root>/backend` onto `sys.path` so `from app.models.domain import
Client` works whether the script is invoked as `./scripts/seeds/foo.py
...` or `python scripts/seeds/foo.py ...`.
"""

from __future__ import annotations

import argparse
import logging
import os
import sys
from contextlib import asynccontextmanager
from pathlib import Path
from urllib.parse import urlparse


def _bootstrap_path() -> None:
    """Add `<repo_root>/backend` to sys.path so scripts can import from
    `app.*` without being inside the backend tree."""
    here = Path(__file__).resolve()
    # scripts/seeds/_common.py → repo_root = parents[2]
    repo_root = here.parents[2]
    backend_dir = repo_root / "backend"
    if str(backend_dir) not in sys.path:
        sys.path.insert(0, str(backend_dir))


_bootstrap_path()

# Now safe to import from the backend app
from sqlalchemy.ext.asyncio import (  # noqa: E402
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)


# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

def configure_logging(level: str = "INFO") -> logging.Logger:
    logging.basicConfig(
        level=getattr(logging, level.upper(), logging.INFO),
        format="%(asctime)s  %(levelname)-7s  %(message)s",
        datefmt="%H:%M:%S",
        stream=sys.stdout,
    )
    return logging.getLogger("seed")


# ---------------------------------------------------------------------------
# Database URL resolution + prod safety
# ---------------------------------------------------------------------------

LOCAL_HOSTS = {"localhost", "127.0.0.1", "::1", "vantai-postgres", "postgres"}


def resolve_database_url() -> str:
    """Return the DATABASE_URL the script should use.

    Order:
      1. `DATABASE_URL` env var (preferred — same convention as the app).
      2. `app.config.settings.DATABASE_URL` fallback.
    """
    url = os.environ.get("DATABASE_URL")
    if url:
        return url
    from app.config import settings  # type: ignore[import-not-found]
    return settings.DATABASE_URL


def is_local_target(url: str) -> bool:
    """True if the URL points at a localhost-style host."""
    parsed = urlparse(url.replace("postgresql+asyncpg://", "postgresql://"))
    host = (parsed.hostname or "").lower()
    return host in LOCAL_HOSTS or host == ""


def assert_safe_target(args: argparse.Namespace, log: logging.Logger) -> str:
    """Echo the resolved URL and abort if pointing at a non-local host
    without `--prod` confirmation. Returns the (asyncpg-form) URL."""
    raw = resolve_database_url()
    log.info("Database target: %s", _redact(raw))
    if not is_local_target(raw) and not getattr(args, "prod", False):
        log.error(
            "Refusing to run against a non-local DB without --prod. "
            "Pass --prod to confirm you want to write to %s.",
            _redact(raw),
        )
        sys.exit(2)
    if "+asyncpg" not in raw:
        raw = raw.replace("postgresql://", "postgresql+asyncpg://", 1)
    return raw


def _redact(url: str) -> str:
    """Strip the password from a URL so it's safe to log."""
    parsed = urlparse(url)
    if parsed.password:
        netloc = f"{parsed.username}:***@{parsed.hostname}"
        if parsed.port:
            netloc += f":{parsed.port}"
        return parsed._replace(netloc=netloc).geturl()
    return url


# ---------------------------------------------------------------------------
# Session factory
# ---------------------------------------------------------------------------

@asynccontextmanager
async def open_session(database_url: str):
    """Yield an `AsyncSession` against a fresh engine; dispose on exit."""
    engine = create_async_engine(database_url, echo=False)
    sm = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    try:
        async with sm() as session:
            yield session
    finally:
        await engine.dispose()


# ---------------------------------------------------------------------------
# Argparse helpers
# ---------------------------------------------------------------------------

def add_common_args(parser: argparse.ArgumentParser) -> None:
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Parse and report planned inserts; do not write to the database.",
    )
    parser.add_argument(
        "--prod",
        action="store_true",
        help="Confirm writes to a non-local DB. Required when DATABASE_URL "
             "host is not localhost / 127.0.0.1.",
    )
    parser.add_argument(
        "--log-level",
        default="INFO",
        choices=["DEBUG", "INFO", "WARNING", "ERROR"],
        help="Stdout log level (default: INFO).",
    )


def add_files_arg(parser: argparse.ArgumentParser, required: bool = True) -> None:
    parser.add_argument(
        "--files",
        nargs="+",
        required=required,
        type=Path,
        metavar="PATH",
        help="One or more source Excel files (.xlsx / .xls).",
    )
    parser.add_argument(
        "--allow-missing-files",
        action="store_true",
        help="Skip files that don't exist instead of aborting.",
    )


def filter_existing_files(paths: list[Path], log: logging.Logger,
                          allow_missing: bool) -> list[Path]:
    out: list[Path] = []
    for p in paths:
        if p.exists():
            out.append(p)
            continue
        msg = f"File not found: {p}"
        if allow_missing:
            log.warning("[skip] %s", msg)
        else:
            log.error(msg)
            sys.exit(2)
    return out
