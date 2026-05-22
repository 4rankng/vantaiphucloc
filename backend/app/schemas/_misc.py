from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field

from ._delivered_trip import DeliveredTripCreate

__all__ = [
    "CancelRequest",
    "SoftDeleteRequest",
    "BatchDeliveredTripCreate",
    "BatchDeliveredTripResult",
    "BulkImportAndMatchResult",
    "TemplateParseResponse",
]


class CancelRequest(BaseModel):
    reason: str = Field(..., min_length=1, description="Required reason for cancellation")


class SoftDeleteRequest(BaseModel):
    reason: str = Field(..., min_length=1, description="Required reason for soft deletion")


class BatchDeliveredTripCreate(BaseModel):
    items: list[DeliveredTripCreate] = Field(..., max_length=50)


class BatchDeliveredTripResult(BaseModel):
    index: int
    id: int | None = None
    success: bool
    error: str | None = None


class BulkImportAndMatchResult(BaseModel):
    total_rows: int
    created: int
    matched: int
    warnings: int
    unmatched: int
    errors: list[str] = Field(default_factory=list)


class TemplateParseResponse(BaseModel):
    filename: str
    sheet_name: str
    total_rows: int
    columns: list[str]
    rows: list[dict[str, Any]]
    duplicate_groups: list[dict[str, Any]] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
