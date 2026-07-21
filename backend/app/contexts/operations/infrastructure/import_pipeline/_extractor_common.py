"""Shared constants, helpers, and data model for pattern extractors.

Canonical home for utilities used by both the pattern detector and the
individual extractors.  This module has **no imports from pattern_detector**
to avoid circular dependencies.
"""

from __future__ import annotations

import os
import re
from dataclasses import dataclass
from datetime import date

from app.contexts.operations.infrastructure.import_pipeline.value_parsers import (
    parse_container_no,
    parse_freight_kind,
)
from app.contexts.operations.infrastructure.import_pipeline.workbook import SheetView


# ---------------------------------------------------------------------------
# Container header detection (used by both detector and extractors)
# ---------------------------------------------------------------------------

_CONTAINER_SYNONYMS = {
    "CONTAINER",
    "CONTAINER NO",
    "CONTAINERNO",
    "CONTNO",
    "CONT NO",
    "CONTAINER ID",
    "CTR NO",
    "CTNR",
    "CONTAINER#",
    "SỐ CONTAINER",
    "SO CONTAINER",
    "SỐ CONT",
    "SO CONT",
    "SỐCONTAINER",
    "SOCONTAINER",  # no-space variant from SL sheets
    "MÃ CONT",
    "MA CONT",
    "MÃ CONTAINER",
    "MA CONTAINER",
    "หมายเลขตู้",
    "CONT",
}


def is_container_header(cell) -> bool:
    """True if the cell is a Container NUMBER header.

    Accepts "Container", "Số Container", "หมายเลขตู้" etc.
    Rejects "Vị trí Container", "Loại Container" which also contain
    the word but refer to position/type.
    """
    t = cell_upper(cell)
    if t in _CONTAINER_SYNONYMS:
        return True
    return (
        t.startswith("CONTAINER")
        or t.startswith("SỐ CONT")
        or t.startswith("SO CONT")
        or t.startswith("SỐCONT")
        or t.startswith("SOCONT")
    )


# ---------------------------------------------------------------------------
# Shared compiled regexes
# ---------------------------------------------------------------------------

_PORT_CODE_RE = re.compile(r"^[A-Z]{2,5}$")
_SETTLEMENT_WT_HEADERS = {"F20", "F40", "E20", "E40"}


# ---------------------------------------------------------------------------
# Cell text helpers (canonical home — deduplicated from pattern_detector.py)
# ---------------------------------------------------------------------------


def cell_text(cell) -> str:
    if cell is None:
        return ""
    return str(cell).strip()


def cell_upper(cell) -> str:
    return cell_text(cell).upper()


# ---------------------------------------------------------------------------
# ExtractedRow — shared data model for all pattern extractors
# ---------------------------------------------------------------------------


@dataclass
class ExtractedRow:
    container_number: str
    cont_type: str  # E20, E40, F20, F40 (container type code)
    pickup: str
    dropoff: str
    vessel_name: str
    source_row_index: int  # 0-based row in the sheet
    work_type: str = "CHUYỂN BÃI"  # Operation type: CHUYỂN BÃI, XUẤT/NHẬP TÀU, etc.
    consignee: str = ""
    vehicle_plate: str = ""
    freight_charge: float | None = None
    freight_kind_unknown: bool = (
        False  # True if container E/F kind was not explicitly found
    )
    trip_date: date | None = None  # Parsed from NGÀY ĐI column (settlement list)
    confidence: float = 1.0  # Mapping quality per row (0.0 – 1.0)
    source: str = "pattern"  # one of: pattern, synonym, fuzzy, value_pattern, ai, profile, unmapped


# ---------------------------------------------------------------------------
# Shared helpers (used by bay_plan and stacking_plan)
# ---------------------------------------------------------------------------


def vessel_from_filename(filename: str) -> str:
    """Try to extract a vessel name from the filename."""
    base = os.path.basename(filename)
    # Remove extension and leading numbers/dots
    name = os.path.splitext(base)[0]
    name = re.sub(r"^[\d.]+\s*", "", name)
    # Remove trailing voyage codes like "2612N", "2615N", "062S"
    name = re.sub(r"\s+\d{3,4}[NSWE]$", "", name, flags=re.IGNORECASE)
    return name.strip()


def find_header_row(sheet: SheetView, max_scan: int) -> int | None:
    """Find the first row with a Container NUMBER header."""
    for r in range(min(max_scan, len(sheet.rows))):
        for cell in sheet.rows[r]:
            if is_container_header(cell):
                return r
    return None


def build_fe_lookup(system_export: SheetView | None) -> dict[str, str]:
    """Scan a System Export / EIR sheet to build container → F/E mapping."""
    if system_export is None:
        return {}

    header_idx = find_header_row(system_export, 3)
    if header_idx is None:
        return {}

    header = system_export.rows[header_idx]
    cont_col: int | None = None
    fe_col: int | None = None

    for c, cell in enumerate(header):
        t = cell_upper(cell)
        if cont_col is None and ("CONTAINER" in t or "หมายเลขตู้" in t):
            cont_col = c
        if fe_col is None and t in (
            "F/E",
            "FE",
            "F E",
            "RỖNG/HÀNG",
            "RONG/HANG",
            "HÀNG/RỖNG",
            "HANG/RONG",
            "LÕ/HÀNG",
            "空/重(E/F)",
            "空/重",
        ):
            fe_col = c

    if cont_col is None or fe_col is None:
        fe_col = _find_fe_col_by_sampling(system_export, header_idx)
        if cont_col is None or fe_col is None:
            return {}

    lookup: dict[str, str] = {}
    for r in range(header_idx + 1, len(system_export.rows)):
        row = system_export.rows[r]
        cont_val = cell_text(row[cont_col]) if cont_col < len(row) else ""
        fe_val = cell_text(row[fe_col]) if fe_col < len(row) else ""
        if cont_val and fe_val:
            try:
                norm = parse_container_no(cont_val)
                fk = parse_freight_kind(fe_val)
                lookup[norm] = fk
            except ValueError:
                continue
    return lookup


def _find_fe_col_by_sampling(sheet: SheetView, header_idx: int) -> int | None:
    """Scan columns for one that contains mostly E/F values."""
    data_start = header_idx + 1
    data_end = min(data_start + 30, len(sheet.rows))
    if data_start >= data_end:
        return None

    for c in range(min(70, sheet.n_cols)):
        fe_count = 0
        for r in range(data_start, data_end):
            row = sheet.rows[r]
            if c < len(row):
                v = cell_upper(row[c])
                if v in ("E", "F", "H", "R", "EMPTY", "FULL"):
                    fe_count += 1
        if fe_count >= 5:
            return c
    return None
