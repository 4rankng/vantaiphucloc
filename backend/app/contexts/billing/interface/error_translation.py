"""Map Billing domain errors to FastAPI HTTPExceptions."""

from __future__ import annotations

from fastapi import HTTPException

from app.contexts.billing.domain.exceptions import SettlementClientNotFound

_STATUS_BY_TYPE: dict[type[Exception], int] = {
    SettlementClientNotFound: 404,
}


def to_http(error: Exception) -> HTTPException:
    for cls, status in _STATUS_BY_TYPE.items():
        if isinstance(error, cls):
            return HTTPException(status_code=status, detail=str(error))
    raise error
