"""Generate human-readable codes for WorkOrders and TripOrders.

Format: {PARTNER_CODE}{SEQ}  e.g. ABC0001, ABC0002, ABC10000
- PARTNER_CODE comes from partners.code (uppercased, alphanumeric only)
- Fallback: first 3 chars of partner name (uppercased, alphanumeric only)
- SEQ is the per-partner sequential count of existing orders + 1
- Minimum 4 digits, auto-expands when count > 9999
"""

import re

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.domain import Partner, WorkOrder, TripOrder


def _clean_code(raw: str | None, fallback: str) -> str:
    """Extract uppercase alphanumeric characters, fallback to 3 chars of name."""
    if raw:
        cleaned = re.sub(r"[^A-Za-z0-9]", "", raw).upper()
        if cleaned:
            return cleaned[:6]
    return re.sub(r"[^A-Za-z0-9]", "", fallback).upper()[:3]


def _format_seq(n: int) -> str:
    """Format sequential number: minimum 4 digits, auto-expands."""
    digits = max(4, len(str(n)))
    return f"{n:0{digits}d}"


def _extract_max_seq(codes: list[str]) -> int:
    """Extract the maximum numeric suffix from a list of codes."""
    max_seq = 0
    for code in codes:
        m = re.search(r"(\d+)$", code)
        if m:
            max_seq = max(max_seq, int(m.group(1)))
    return max_seq


async def generate_work_order_code(db: AsyncSession, partner_id: int) -> str:
    partner_res = await db.execute(
        select(Partner.code, Partner.name).where(Partner.id == partner_id)
    )
    row = partner_res.one_or_none()
    if not row:
        return f"W{partner_id:08d}"
    partner_code, partner_name = row
    prefix = _clean_code(partner_code, partner_name)

    result = await db.execute(
        select(WorkOrder.code).where(
            WorkOrder.partner_id == partner_id,
            WorkOrder.code.isnot(None),
        )
    )
    max_seq = _extract_max_seq([r[0] for r in result.all()])
    return f"{prefix}{_format_seq(max_seq + 1)}"


async def generate_trip_order_code(db: AsyncSession, partner_id: int) -> str:
    partner_res = await db.execute(
        select(Partner.code, Partner.name).where(Partner.id == partner_id)
    )
    row = partner_res.one_or_none()
    if not row:
        return f"T{partner_id:08d}"
    partner_code, partner_name = row
    prefix = _clean_code(partner_code, partner_name)

    result = await db.execute(
        select(TripOrder.code).where(
            TripOrder.partner_id == partner_id,
            TripOrder.code.isnot(None),
        )
    )
    max_seq = _extract_max_seq([r[0] for r in result.all()])
    return f"{prefix}{_format_seq(max_seq + 1)}"
