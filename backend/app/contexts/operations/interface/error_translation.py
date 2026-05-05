"""Translate Operations domain exceptions into HTTPException."""

from __future__ import annotations

from fastapi import HTTPException

from app.contexts.operations.application.reconciliation import (
    ReconciliationConflict,
)
from app.contexts.operations.domain.exceptions import (
    AlreadyExists,
    ContainerCountInvalid,
    InvalidStateTransition,
    NotFound,
    TripOrderLocked,
    WorkOrderLocked,
)


def translate(exc: Exception) -> HTTPException:
    if isinstance(exc, NotFound):
        return HTTPException(status_code=404, detail=str(exc))
    if isinstance(exc, AlreadyExists):
        return HTTPException(status_code=409, detail=str(exc))
    if isinstance(exc, (TripOrderLocked, WorkOrderLocked)):
        return HTTPException(status_code=403, detail=str(exc))
    if isinstance(exc, InvalidStateTransition):
        return HTTPException(status_code=400, detail=str(exc))
    if isinstance(exc, ContainerCountInvalid):
        return HTTPException(status_code=422, detail=str(exc))
    if isinstance(exc, ReconciliationConflict):
        return HTTPException(status_code=409, detail=exc.msg)
    if isinstance(exc, PermissionError):
        return HTTPException(status_code=403, detail=str(exc))
    if isinstance(exc, ValueError):
        return HTTPException(status_code=422, detail=str(exc))
    return HTTPException(status_code=500, detail=str(exc))
