"""Generate human-readable codes for WorkOrders and TripOrders.

Format: {CLIENT_CODE}{SEQ}  e.g. ABC0001, ABC0002, ABC10000
- CLIENT_CODE comes from clients.code (uppercased, alphanumeric only)
- Fallback: first 3 chars of client name (uppercased, alphanumeric only)
- SEQ is the per-client sequential count of existing orders + 1
- Minimum 4 digits, auto-expands when count > 9999
"""

import re

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.domain import Client, WorkOrder, TripOrder


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


async def generate_work_order_code(db: AsyncSession, client_id: int) -> str:
    client_res = await db.execute(
        select(Client.code, Client.name).where(Client.id == client_id)
    )
    row = client_res.one_or_none()
    if not row:
        return f"W{client_id:08d}"
    client_code, client_name = row
    prefix = _clean_code(client_code, client_name)

    count_res = await db.execute(
        select(func.count(WorkOrder.id)).where(WorkOrder.client_id == client_id)
    )
    count = count_res.scalar() or 0
    return f"{prefix}{_format_seq(count + 1)}"


async def generate_trip_order_code(db: AsyncSession, client_id: int) -> str:
    client_res = await db.execute(
        select(Client.code, Client.name).where(Client.id == client_id)
    )
    row = client_res.one_or_none()
    if not row:
        return f"T{client_id:08d}"
    client_code, client_name = row
    prefix = _clean_code(client_code, client_name)

    count_res = await db.execute(
        select(func.count(TripOrder.id)).where(TripOrder.client_id == client_id)
    )
    count = count_res.scalar() or 0
    return f"{prefix}{_format_seq(count + 1)}"
