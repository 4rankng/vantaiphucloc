"""Auto audit logging via SQLAlchemy session events.

Registers before_flush / after_flush listeners on the sync Session
so that every CREATE, UPDATE, DELETE on AuditableMixin models is
logged automatically — no manual log_action() calls needed.

For operations that need an explicit reason (CANCEL, UNMATCH),
call set_audit_reason("...") before the db mutation.
"""

import json
import logging

from sqlalchemy import event
from sqlalchemy.orm import Session, attributes

from app.models.audit_log import AuditLog
from app.core.audit_context import (
    get_audit_user_id,
    get_audit_request,
    get_audit_reason,
)

_log = logging.getLogger(__name__)

_EVENTS_REGISTERED = False


# ── helpers ──────────────────────────────────────────────────────────────────


def _is_auditable(obj: object) -> bool:
    return getattr(obj, '__auditable__', False) is True


def _serialize(obj: object) -> dict:
    exclude = getattr(obj, '__audit_exclude_fields__', set())
    mapper = obj.__class__.__mapper__
    return {
        c.key: getattr(obj, c.key)
        for c in mapper.columns
        if c.key not in exclude
    }


def _capture_dirty(obj: object) -> tuple[dict | None, dict | None]:
    """Return (old, new) dicts of changed fields for a dirty object."""
    exclude = getattr(obj, '__audit_exclude_fields__', set())
    mapper = obj.__class__.__mapper__
    old: dict = {}
    new: dict = {}
    for c in mapper.columns:
        key = c.key
        if key in exclude:
            continue
        hist = attributes.get_history(obj, key)
        if hist.deleted:
            old[key] = hist.deleted[0]
            new[key] = hist.added[0] if hist.added else None
    return (old, new) if old else (None, None)


def _json(val: dict | None) -> str | None:
    return json.dumps(val, ensure_ascii=False, default=str) if val else None


# ── event listeners ──────────────────────────────────────────────────────────


def register_audit_events() -> None:
    global _EVENTS_REGISTERED
    if _EVENTS_REGISTERED:
        return
    _EVENTS_REGISTERED = True

    @event.listens_for(Session, "before_flush")
    def _capture_changes(session, flush_context, instances):
        seen: set[int] = session.info.setdefault('_audit_seen', set())
        pending: list[dict] = session.info.setdefault('_audit_pending', [])

        for obj in session.new:
            if _is_auditable(obj) and id(obj) not in seen:
                seen.add(id(obj))
                pending.append({'action': 'CREATE', 'obj': obj})

        for obj in session.dirty:
            if _is_auditable(obj) and id(obj) not in seen:
                old_val, new_val = _capture_dirty(obj)
                if old_val is not None:
                    seen.add(id(obj))
                    pending.append({
                        'action': 'UPDATE', 'obj': obj,
                        'old': old_val, 'new': new_val,
                    })

        for obj in session.deleted:
            if _is_auditable(obj) and id(obj) not in seen:
                seen.add(id(obj))
                pending.append({'action': 'DELETE', 'obj': obj})

    @event.listens_for(Session, "after_flush")
    def _write_entries(session, flush_context):
        pending: list[dict] = session.info.get('_audit_pending', [])
        if not pending:
            return

        user_id = get_audit_user_id()
        if user_id is None:
            return

        req = get_audit_request()
        reason = get_audit_reason()

        for item in pending:
            obj = item['obj']
            action = item['action']

            if action == 'CREATE':
                old_value = None
                new_value = _serialize(obj)
            elif action == 'UPDATE':
                old_value = item['old']
                new_value = item['new']
            else:  # DELETE
                old_value = _serialize(obj)
                new_value = None

            entry = AuditLog(
                user_id=user_id,
                action=action,
                table_name=obj.__tablename__,
                record_id=obj.id,
                old_value=_json(old_value),
                new_value=_json(new_value),
                reason=reason,
                ip_address=req.client.host if req and req.client else None,
                user_agent=req.headers.get('user-agent') if req else None,
            )
            session.add(entry)

        session.info['_audit_pending'] = []
        _log.info("AUDIT: %d entries queued for user=%s", len(pending), user_id)


# ── legacy public API (kept for gradual migration) ───────────────────────────

REQUIRES_REASON = {"CANCEL", "UNMATCH"}


async def log_action(
    db, *, user_id, action, table_name, record_id,
    old_value=None, new_value=None, reason=None, request=None,
):
    """Manual audit log entry — prefer set_audit_reason() + auto-capture."""
    from app.core.audit_context import set_audit_reason

    if reason:
        set_audit_reason(reason)

    ip_address = None
    user_agent = None
    if request:
        ip_address = request.client.host if request.client else None
        user_agent = request.headers.get('user-agent')

    entry = AuditLog(
        user_id=user_id,
        action=action,
        table_name=table_name,
        record_id=record_id,
        old_value=_json(old_value),
        new_value=_json(new_value),
        reason=reason,
        ip_address=ip_address,
        user_agent=user_agent,
    )
    db.add(entry)
    await db.flush()
    _log.info("AUDIT: %s %s#%d by user=%s reason=%s", action, table_name, record_id, user_id, reason)
    return entry
