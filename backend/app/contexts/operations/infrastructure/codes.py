"""Generate human-readable codes for WorkOrders and TripOrders.

Format: {PARTNER_CODE}{SEQ}  e.g. ABC0001, ABC0002, ABC10000
- PARTNER_CODE comes from partners.code (uppercased, alphanumeric only)
- Fallback: first 3 chars of partner name (uppercased, alphanumeric only)
- SEQ is the per-partner sequential count of existing orders + 1
- Minimum 4 digits, auto-expands when count > 9999

Concurrency: uses pg_advisory_xact_lock to serialise per-partner code
generation within a single transaction, preventing duplicate-key races.
"""

import re

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.domain import Client, WorkOrder, TripOrder

_LOCK_NS = 7


def _clean_code(raw: str | None, fallback: str) -> str:
    if raw:
        cleaned = re.sub(r"[^A-Za-z0-9]", "", raw).upper()
        if cleaned:
            return cleaned[:6]
    return re.sub(r"[^A-Za-z0-9]", "", fallback).upper()[:3]


def _format_seq(n: int) -> str:
    digits = max(4, len(str(n)))
    return f"{n:0{digits}d}"


def _extract_max_seq(codes: list[str]) -> int:
    max_seq = 0
    for code in codes:
        m = re.search(r"(\d+)$", code)
        if m:
            max_seq = max(max_seq, int(m.group(1)))
    return max_seq


async def _partner_prefix(db: AsyncSession, client_id: int, fallback_char: str) -> str:
    res = await db.execute(
        select(Client.code, Client.name).where(Client.id == client_id)
    )
    row = res.one_or_none()
    if not row:
        return f"{fallback_char}{client_id:07d}"
    return _clean_code(row[0], row[1])


async def _max_wo_seq(db: AsyncSession, client_id: int) -> int:
    res = await db.execute(
        select(WorkOrder.code).where(
            WorkOrder.client_id == client_id,
            WorkOrder.code.isnot(None),
        )
    )
    return _extract_max_seq([r[0] for r in res.all()])


async def _max_to_seq(db: AsyncSession, client_id: int) -> int:
    res = await db.execute(
        select(TripOrder.code).where(
            TripOrder.client_id == client_id,
            TripOrder.code.isnot(None),
        )
    )
    return _extract_max_seq([r[0] for r in res.all()])


async def _advisory_lock(db: AsyncSession, client_id: int) -> None:
    # pg_advisory_xact_lock only works on PostgreSQL; skip in SQLite (tests)
    dialect = db.bind.dialect.name if db.bind else "unknown"
    if dialect == "postgresql":
        await db.execute(
            text("SELECT pg_advisory_xact_lock(:ns, :pid)"),
            {"ns": _LOCK_NS, "pid": client_id},
        )


async def _next_wo_code(db: AsyncSession, client_id: int) -> str:
    prefix = await _partner_prefix(db, client_id, "W")
    max_seq = await _max_wo_seq(db, client_id)
    return f"{prefix}{_format_seq(max_seq + 1)}"


async def _next_to_code(db: AsyncSession, client_id: int) -> str:
    prefix = await _partner_prefix(db, client_id, "T")
    max_seq = await _max_to_seq(db, client_id)
    return f"{prefix}{_format_seq(max_seq + 1)}"


async def generate_work_order_code(db: AsyncSession, client_id: int) -> str:
    """Generate the next unique code for a WorkOrder.

    Acquires a per-partner advisory lock so that concurrent requests for
    the same partner are serialised.  The lock is transaction-scoped and
    auto-releases on COMMIT / ROLLBACK.
    """
    await _advisory_lock(db, client_id)
    return await _next_wo_code(db, client_id)


async def generate_trip_order_code(db: AsyncSession, client_id: int) -> str:
    """Generate the next unique code for a TripOrder.

    Same concurrency strategy as generate_work_order_code.
    """
    await _advisory_lock(db, client_id)
    return await _next_to_code(db, client_id)
