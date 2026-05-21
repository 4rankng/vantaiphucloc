"""Shared Excel parsing and generation utilities for reconciliation flows."""

from __future__ import annotations

import re
from datetime import date, datetime
from typing import Any, Sequence

from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side


# ── Constants ──

TEMPLATE_VERSION = "1.0"

# Standard header styles
_HEADER_FONT = Font(name="Arial", size=11, bold=True, color="FFFFFF")
_HEADER_FILL = PatternFill(start_color="4472C4", end_color="4472C4", fill_type="solid")
_HEADER_ALIGNMENT = Alignment(horizontal="center", vertical="center", wrap_text=True)
_CELL_ALIGNMENT = Alignment(vertical="center", wrap_text=True)
_THIN_BORDER = Border(
    left=Side(style="thin"),
    right=Side(style="thin"),
    top=Side(style="thin"),
    bottom=Side(style="thin"),
)

# Date formats used across all Excel files
DATE_FORMATS = ["%d/%m/%Y", "%d-%m-%Y", "%Y-%m-%d", "%d/%m/%y"]

# Container number pattern
CONTAINER_RE = re.compile(r"\b[A-Z]{4}\d{7}\b")


def parse_date(raw: Any) -> date | None:
    """Parse a date value from Excel cell (handles various formats)."""
    if raw is None:
        return None
    if isinstance(raw, (date, datetime)):
        return raw.date() if isinstance(raw, datetime) else raw
    s = str(raw).strip()
    for fmt in DATE_FORMATS:
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            pass
    return None


def parse_amount(raw: Any) -> int | None:
    """Parse an amount value (strips non-digit chars, returns integer VND)."""
    if raw is None:
        return None
    s = re.sub(r"[^\d]", "", str(raw))
    return int(s) if s else None


def looks_like_container(val: Any) -> bool:
    """Check if a value looks like a container number."""
    if val is None:
        return False
    s = str(val).strip().upper()
    return bool(CONTAINER_RE.match(s))


def detect_column_mapping(headers: Sequence[str], expected_fields: dict[str, list[str]]) -> dict[str, int]:
    """Auto-detect column indices by matching headers against expected field names.

    Args:
        headers: List of header strings from the Excel file
        expected_fields: {field_name: [possible_header_names]}

    Returns:
        {field_name: column_index}
    """
    mapping = {}
    normalized_headers = [str(h).strip().lower() for h in headers]

    for field_name, aliases in expected_fields.items():
        for i, header in enumerate(normalized_headers):
            if any(alias.lower() in header for alias in aliases):
                mapping[field_name] = i
                break
    return mapping


def styled_workbook(title: str, headers: list[str]) -> tuple:
    """Create a styled workbook with header row.

    Returns: (workbook, worksheet, current_row)
    """
    wb = Workbook()
    ws = wb.active
    ws.title = title

    # Header row
    for col, header in enumerate(headers, 1):
        cell = ws.cell(row=1, column=col, value=header)
        cell.font = _HEADER_FONT
        cell.fill = _HEADER_FILL
        cell.alignment = _HEADER_ALIGNMENT
        cell.border = _THIN_BORDER

    # Column widths
    for col in range(1, len(headers) + 1):
        ws.column_dimensions[ws.cell(row=1, column=col).column_letter].width = 18

    return wb, ws, 2


def add_template_version(ws, col: int):
    """Add template version metadata to a hidden metadata cell beyond data columns."""
    version_cell = ws.cell(row=1, column=col + 1, value=f"TEMPLATE_V{TEMPLATE_VERSION}")
    version_cell.font = Font(color="D0D0D0", size=8)  # Light gray, tiny


def get_template_version(ws) -> str | None:
    """Extract template version from metadata cell."""
    for col in range(20, 30):  # Check columns T-AC
        val = ws.cell(row=1, column=col).value
        if val and str(val).startswith("TEMPLATE_V"):
            return str(val).replace("TEMPLATE_V", "")
    return None


def parse_operation_type(raw: Any) -> str | None:
    """Parse operation type string (e.g. from Excel cell) into OperationType enum value."""
    if raw is None:
        return None
    val = str(raw).strip().lower()
    if not val:
        return None

    if "tàu" in val or "tau" in val or "nhập" in val or "xuất" in val:
        return "XUAT_NHAP_TAU"
    if "bãi" in val or "bai" in val:
        return "CHUYEN_BAI"
    if "vỏ" in val or "vo" in val or "hạ" in val or "ha" in val:
        return "LAY_VO_HA_HANG"
    if "sà lan" in val or "sa lan" in val or "lan" in val:
        return "CHAY_SA_LAN"
    if "kho" in val:
        return "DONG_KHO"

    for name in ["XUAT_NHAP_TAU", "CHUYEN_BAI", "LAY_VO_HA_HANG", "CHAY_SA_LAN", "DONG_KHO"]:
        if name.lower() == val:
            return name

    return None
