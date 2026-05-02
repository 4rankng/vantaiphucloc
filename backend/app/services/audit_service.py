"""Audit logging service — records all data mutations."""

import json
import logging
from typing import Optional

from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_log import AuditLog

_log = logging.getLogger(__name__)

REQUIRES_REASON = {"CANCEL", "UNMATCH"}


async def log_action(
    db: AsyncSession,
    *,
    user_id: Optional[int],
    action: str,
    table_name: str,
    record_id: int,
    old_value: Optional[dict] = None,
    new_value: Optional[dict] = None,
    reason: Optional[str] = None,
    request: Optional[Request] = None,
) -> AuditLog:
    if action in REQUIRES_REASON and not reason:
        raise ValueError(f"Reason is required for action '{action}'")

    ip_address = None
    user_agent = None
    if request:
        ip_address = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent")

    entry = AuditLog(
        user_id=user_id,
        action=action,
        table_name=table_name,
        record_id=record_id,
        old_value=json.dumps(old_value, ensure_ascii=False, default=str) if old_value else None,
        new_value=json.dumps(new_value, ensure_ascii=False, default=str) if new_value else None,
        reason=reason,
        ip_address=ip_address,
        user_agent=user_agent,
    )
    db.add(entry)
    await db.flush()

    _log.info("AUDIT: %s %s#%d by user=%s reason=%s", action, table_name, record_id, user_id, reason)
    return entry
