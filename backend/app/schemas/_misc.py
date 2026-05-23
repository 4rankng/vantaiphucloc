from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field

__all__ = [
    "CancelRequest",
    "SoftDeleteRequest",
    "BulkImportResult",
]


class CancelRequest(BaseModel):
    reason: str = Field(..., min_length=1, description="Required reason for cancellation")


class SoftDeleteRequest(BaseModel):
    reason: str = Field(..., min_length=1, description="Required reason for soft deletion")


class BulkImportResult(BaseModel):
    total_rows: int
    created: int
    warnings: int
    errors: list[str] = Field(default_factory=list)
