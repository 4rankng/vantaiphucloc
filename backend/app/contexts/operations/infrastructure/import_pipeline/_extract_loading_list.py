"""Loading List extractor (HAIAN BETA style)."""

from __future__ import annotations

import re

from app.contexts.operations.infrastructure.import_pipeline._extractor_common import (
    ExtractedRow,
    cell_text,
    cell_upper,
)
from app.contexts.operations.infrastructure.import_pipeline.value_parsers import (
    build_cont_type,
    parse_container_no,
    parse_size_type,
)
from app.contexts.operations.infrastructure.import_pipeline.workbook import SheetView


def extract_loading_list(sheets: list[SheetView], filename: str = "") -> tuple[list[ExtractedRow], list[dict]]:
    """Extract from HAIAN BETA style Loading List."""
    # Find the sheet with CONTAINERNo. + F/E + SIZE header
    sheet = _find_loading_list_sheet(sheets)
    if sheet is None:
        return [], []

    # Get POL from header rows 1-10
    pickup = _find_pol(sheet)

    # Get vessel name from header rows 1-10
    vessel_name = _find_vessel_in_header(sheet)

    # Find header row with CONTAINERNo.
    header_idx = None
    for r in range(min(15, len(sheet.rows))):
        row = sheet.rows[r]
        for cell in row:
            if "CONTAINERNO" in cell_upper(cell):
                header_idx = r
                break
        if header_idx is not None:
            break

    if header_idx is None:
        return [], []

    # Map columns from header
    header = sheet.rows[header_idx]
    col_map = _map_loading_list_cols(header)

    accepted: list[ExtractedRow] = []
    rejected: list[dict] = []

    for r in range(header_idx + 1, len(sheet.rows)):
        row = sheet.rows[r]
        cont_val = cell_text(row[col_map["container"]]) if col_map.get("container") is not None and col_map["container"] < len(row) else ""
        if not cont_val:
            break  # loading lists end at first empty container cell

        try:
            cont_no = parse_container_no(cont_val)
        except ValueError:
            rejected.append({"source_row_index": r, "reason": "bad_container_no", "raw": cont_val})
            continue

        fe_val = cell_text(row[col_map["fe"]]) if col_map.get("fe") is not None and col_map["fe"] < len(row) else "E"
        size_val = cell_text(row[col_map["size"]]) if col_map.get("size") is not None and col_map["size"] < len(row) else ""
        pod = cell_text(row[col_map["pod"]]) if col_map.get("pod") is not None and col_map["pod"] < len(row) else ""

        size, _ = parse_size_type(size_val)
        work_type = build_cont_type(fe_val, size or size_val)

        accepted.append(ExtractedRow(
            container_number=cont_no,
            cont_type=work_type,
            pickup=pickup,
            dropoff=pod,
            vessel_name=vessel_name,
            source_row_index=r,
        ))

    return accepted, rejected


# ---------------------------------------------------------------------------
# Private helpers
# ---------------------------------------------------------------------------

def _find_loading_list_sheet(sheets: list[SheetView]) -> SheetView | None:
    for sheet in sheets:
        if sheet.state == "veryHidden":
            continue
        for r in range(8, min(16, len(sheet.rows))):
            row_text = " ".join(cell_upper(c) for c in sheet.rows[r])
            if "CONTAINERNO" in row_text and "F/E" in row_text:
                return sheet
    return None


def _map_loading_list_cols(header: list) -> dict[str, int | None]:
    col_map: dict[str, int | None] = {"container": None, "fe": None, "size": None, "pod": None}
    for c, cell in enumerate(header):
        t = cell_upper(cell)
        if "CONTAINERNO" in t or "CONTAINER NO" in t:
            col_map["container"] = c
        elif t in ("F/E", "FE", "F E"):
            col_map["fe"] = c
        elif t == "SIZE" or t == "SZ":
            col_map["size"] = c
        elif t == "POD":
            col_map["pod"] = c
    return col_map


def _find_pol(sheet: SheetView) -> str:
    for r in range(min(10, len(sheet.rows))):
        for cell in sheet.rows[r]:
            t = cell_text(cell).upper()
            if "PORT OF LOADING" in t:
                m = re.search(r"PORT OF LOADING:\s*(.+)", cell_text(cell), re.IGNORECASE)
                if m:
                    return m.group(1).strip()
                # Value might be in next cell
        row = sheet.rows[r]
        for c, cell in enumerate(row):
            if "PORT OF LOADING" in cell_text(cell).upper():
                for c2 in range(c + 1, min(c + 5, len(row))):
                    v = cell_text(row[c2])
                    if v:
                        return v
    return "HAIPHONG"


def _find_vessel_in_header(sheet: SheetView) -> str:
    vessel = ""
    voyage = ""
    for r in range(min(10, len(sheet.rows))):
        row = sheet.rows[r]
        for c, cell in enumerate(row):
            t = cell_text(cell).upper().strip()
            if "VESSEL" in t and ":" in t and "OPR" not in t:
                # Check same cell
                m = re.search(r"VESSEL:\s*(.+)", cell_text(cell), re.IGNORECASE)
                if m:
                    vessel = m.group(1).strip()
                else:
                    # Check cells to the right
                    for c2 in range(c + 1, min(c + 5, len(row))):
                        v = cell_text(row[c2])
                        if v:
                            vessel = v
                            break
            elif t.startswith("VOY") and ":" in t:
                for c2 in range(c + 1, min(c + 5, len(row))):
                    v = cell_text(row[c2])
                    if v:
                        voyage = v
                        break

    if vessel and voyage:
        return f"{vessel} {voyage}".strip()
    return vessel
