"""Customer-template cache.

Lookup / upsert helpers around `customer_import_templates`. The pipeline
calls `find_template(client_id, structure_hash)` after detecting the
sheet + header row, and reuses the saved mapping if a row exists. On
commit, `save_template(...)` upserts the mapping the user confirmed.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.domain import CustomerImportTemplate


async def find_template(
    db: AsyncSession,
    client_id: int | None,
    structure_hash: str,
) -> CustomerImportTemplate | None:
    if client_id is None:
        return None
    res = await db.execute(
        select(CustomerImportTemplate).where(
            CustomerImportTemplate.client_id == client_id,
            CustomerImportTemplate.structure_hash == structure_hash,
        )
    )
    return res.scalar_one_or_none()


async def save_template(
    db: AsyncSession,
    *,
    client_id: int | None,
    structure_hash: str,
    template_name: str,
    sheet_name: str,
    header_row_index: int,
    column_mapping: list[dict[str, Any]],
    user_id: int | None,
) -> CustomerImportTemplate:
    existing = await find_template(db, client_id, structure_hash)
    now = datetime.now(timezone.utc)
    if existing is None:
        row = CustomerImportTemplate(
            client_id=client_id,
            template_name=template_name,
            structure_hash=structure_hash,
            sheet_name=sheet_name,
            header_row_index=header_row_index,
            column_mapping=column_mapping,
            last_used_at=now,
            last_used_by=user_id,
            created_by_id=user_id,
        )
        db.add(row)
        await db.flush()
        return row
    existing.template_name = template_name
    existing.sheet_name = sheet_name
    existing.header_row_index = header_row_index
    existing.column_mapping = column_mapping
    existing.last_used_at = now
    existing.last_used_by = user_id
    await db.flush()
    return existing


async def list_templates_for_partner(
    db: AsyncSession, client_id: int
) -> list[CustomerImportTemplate]:
    res = await db.execute(
        select(CustomerImportTemplate)
        .where(CustomerImportTemplate.client_id == client_id)
        .order_by(CustomerImportTemplate.last_used_at.desc())
    )
    return list(res.scalars().all())
