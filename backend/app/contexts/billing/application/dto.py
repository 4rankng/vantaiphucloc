"""Application DTOs for Billing."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass
class SettlementExportDTO:
    workbook_bytes: bytes
    filename: str
    line_count: int
    total_with_vat: int
