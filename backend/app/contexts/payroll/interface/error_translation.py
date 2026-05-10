"""Translate Payroll domain errors to FastAPI HTTPExceptions."""

from __future__ import annotations

from fastapi import HTTPException

from app.contexts.payroll.domain.exceptions import InvalidSalaryConfig

_STATUS_BY_TYPE: dict[type[Exception], int] = {
    InvalidSalaryConfig: 400,
}


def to_http(error: Exception) -> HTTPException:
    for cls, status in _STATUS_BY_TYPE.items():
        if isinstance(error, cls):
            return HTTPException(status_code=status, detail=str(error))
    raise error
