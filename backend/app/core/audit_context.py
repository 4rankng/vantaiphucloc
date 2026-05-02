"""Audit context — per-request contextvars for auto audit logging."""

from contextvars import ContextVar
from typing import Optional

from fastapi import Request

_audit_user_id: ContextVar[Optional[int]] = ContextVar('_audit_user_id', default=None)
_audit_request: ContextVar[Optional[Request]] = ContextVar('_audit_request', default=None)
_audit_reason: ContextVar[Optional[str]] = ContextVar('_audit_reason', default=None)


def set_audit_context(user_id: int, request: Optional[Request] = None) -> None:
    _audit_user_id.set(user_id)
    _audit_request.set(request)


def set_audit_reason(reason: str) -> None:
    _audit_reason.set(reason)


def clear_audit_context() -> None:
    _audit_user_id.set(None)
    _audit_request.set(None)
    _audit_reason.set(None)


def get_audit_user_id() -> Optional[int]:
    return _audit_user_id.get()


def get_audit_request() -> Optional[Request]:
    return _audit_request.get()


def get_audit_reason() -> Optional[str]:
    return _audit_reason.get()
