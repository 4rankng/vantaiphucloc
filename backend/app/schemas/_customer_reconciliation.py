from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field

__all__ = [
    "CustomerReconciliationRowInput",
    "CustomerReconciliationPreviewRequest",
    "CustomerReconciliationRowOut",
    "CustomerReconciliationImportOut",
    "RowVerdictUpdate",
]


class CustomerReconciliationRowInput(BaseModel):
    """One parsed row from a customer's reconciliation file."""

    container_number: str | None = Field(default=None, max_length=50)
    trip_date: date | None = None
    customer_status: str = Field(..., pattern="^(MATCHED|REJECTED|UNKNOWN)$")
    customer_note: str | None = Field(default=None, max_length=500)
    customer_amount: int | None = None


class CustomerReconciliationPreviewRequest(BaseModel):
    client_id: int
    period_start: date
    period_end: date
    source_filename: str | None = Field(default=None, max_length=500)
    rows: list[CustomerReconciliationRowInput]


class CustomerReconciliationRowOut(BaseModel):
    id: int
    container_number: str | None = None
    trip_date: date | None = None
    customer_status: str
    customer_note: str | None = None
    resolved_booked_trip_id: int | None = None
    apply_status: str
    apply_message: str | None = None
    diff_classification: str | None = None
    customer_amount: int | None = None
    our_amount: int | None = None


class CustomerReconciliationImportOut(BaseModel):
    id: int
    client_id: int
    client_name: str | None = None
    period_start: date
    period_end: date
    source_filename: str | None = None
    status: str  # PARSED | APPLIED
    summary: dict | None = None
    uploaded_at: datetime
    applied_at: datetime | None = None
    rows: list[CustomerReconciliationRowOut] = []


class RowVerdictUpdate(BaseModel):
    """Per-row action for customer reconciliation."""
    action: str = Field(..., pattern="^(accept|dispute|edit)$")
    amount: int | None = None
    note: str | None = Field(default=None, max_length=500)
