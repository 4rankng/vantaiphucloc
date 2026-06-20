"""Dual Panel extractor (side-by-side 40HC + 20GP tables)."""

from __future__ import annotations

import re

from app.contexts.operations.infrastructure.import_pipeline._extractor_common import (
    ExtractedRow,
    cell_text,
    cell_upper,
    is_container_header,
    vessel_from_filename,
)
from app.contexts.operations.infrastructure.import_pipeline.pattern_detector import (
    _score_dual_panel,
)
from app.contexts.operations.infrastructure.import_pipeline.value_parsers import (
    build_cont_type,
    parse_container_no,
)
from app.contexts.operations.infrastructure.import_pipeline.workbook import SheetView


def extract_dual_panel(
    sheets: list[SheetView], filename: str = ""
) -> tuple[list[ExtractedRow], list[dict]]:
    """Extract from Dual Panel (side-by-side 40HC + 20GP tables).

    Layout: [STT | Số cont | Vị trí | Size | <gap> | STT | Số cont | Vị trí | Size]
    Section headers above may indicate size (e.g., "40HC", "20GP").
    """
    sheet = None
    for s in sheets:
        if s.state != "veryHidden":
            if _score_dual_panel(s) >= 0.6:
                sheet = s
                break
    if not sheet:
        return [], []

    vessel_name = vessel_from_filename(filename)

    # Find header row with 2 container headers
    header_idx = None
    container_cols: list[int] = []

    for r in range(min(15, len(sheet.rows))):
        row = sheet.rows[r]
        cols = [c for c, cell in enumerate(row) if is_container_header(cell)]
        if len(cols) >= 2:
            header_idx = r
            container_cols = cols[:2]
            break

    if header_idx is None:
        return [], []

    left_cont = container_cols[0]
    right_cont = container_cols[1]
    header = sheet.rows[header_idx]

    # Find size column within each panel's column range
    left_size = _find_nearby_size_col(header, left_cont, right_cont)
    right_size = _find_nearby_size_col(
        header, right_cont, len(header) if header else 999
    )

    # Check section header rows above for size hints (e.g., "40HC", "20GP")
    left_size_hint = _find_section_size(sheet, header_idx, 0, right_cont)
    right_size_hint = _find_section_size(
        sheet, header_idx, right_cont, len(header) if header else 999
    )

    accepted: list[ExtractedRow] = []
    rejected: list[dict] = []

    for r in range(header_idx + 1, len(sheet.rows)):
        row = sheet.rows[r]
        # Left panel
        _extract_panel_row(
            row,
            r,
            left_cont,
            left_size,
            left_size_hint,
            vessel_name,
            accepted,
            rejected,
        )
        # Right panel
        _extract_panel_row(
            row,
            r,
            right_cont,
            right_size,
            right_size_hint,
            vessel_name,
            accepted,
            rejected,
        )

    return accepted, rejected


# ---------------------------------------------------------------------------
# Private helpers
# ---------------------------------------------------------------------------


def _find_nearby_size_col(header: list, cont_col: int, boundary: int) -> int | None:
    """Find a Size column within the panel (cont_col to boundary)."""
    for c in range(cont_col, min(boundary, len(header))):
        t = cell_upper(header[c])
        if "KÍCH THƯỚC" in t or "SIZE" in t or "SZ" in t or "KICH THUOC" in t:
            return c
    return None


def _find_section_size(
    sheet: SheetView, header_idx: int, col_start: int, col_end: int
) -> str:
    """Look for section headers like '40HC' or '20GP' above the header row."""
    for r in range(max(0, header_idx - 3), header_idx):
        row = sheet.rows[r]
        for c in range(col_start, min(col_end, len(row))):
            t = cell_upper(row[c])
            if re.match(r"^(20|40)(?:HC|GP|DC|RF|'|$)", t):
                return t.strip()
    return ""


def _extract_panel_row(
    row,
    row_idx: int,
    cont_col: int,
    size_col: int | None,
    size_hint: str,
    vessel_name: str,
    accepted: list[ExtractedRow],
    rejected: list[dict],
) -> None:
    """Extract a container from one panel of a dual-panel row."""
    cont_val = cell_text(row[cont_col]) if cont_col < len(row) else ""
    if not cont_val:
        return

    try:
        cont_no = parse_container_no(cont_val)
    except ValueError:
        rejected.append(
            {"source_row_index": row_idx, "reason": "bad_container_no", "raw": cont_val}
        )
        return

    # Get size from column or section hint
    size_val = ""
    if size_col is not None and size_col < len(row):
        size_val = cell_text(row[size_col])
    if not size_val and size_hint:
        size_val = size_hint

    work_type = build_cont_type("E", size_val)

    accepted.append(
        ExtractedRow(
            container_number=cont_no,
            cont_type=work_type,
            pickup="",
            dropoff="",
            vessel_name=vessel_name,
            source_row_index=row_idx,
            freight_kind_unknown=True,  # Hardcoded to E, not explicitly provided
        )
    )
