"""Pattern-specific extractors for known shipping Excel formats.

Each extractor reads a list[SheetView] and returns flat rows in the same
shape that ``pipeline._parse_row`` produces, plus a vessel_name string.
They reuse ``value_parsers`` for normalisation so validation is consistent.
"""

from __future__ import annotations

import os
import re
from dataclasses import dataclass
from typing import Any

from app.contexts.operations.infrastructure.import_pipeline.value_parsers import (
    build_cont_type,
    parse_container_no,
    parse_freight_kind,
    parse_size_type,
    parse_string,
)
from app.contexts.operations.infrastructure.import_pipeline.workbook import SheetView

# Reuse the strict Container-header check from the detector
from app.contexts.operations.infrastructure.import_pipeline.pattern_detector import is_container_header


@dataclass
class ExtractedRow:
    container_number: str
    work_type: str          # E20, E40, F20, F40
    pickup: str
    dropoff: str
    vessel_name: str
    source_row_index: int   # 0-based row in the sheet


# ---------------------------------------------------------------------------
# Bay Plan  (GLORY SHANGHAI / CONSCIENCE style)
# ---------------------------------------------------------------------------

_CONTAINER_NO_RE = re.compile(r"^[A-Z]{4}\d{7}$")
_PORT_CODE_RE = re.compile(r"^[A-Z]{2,5}$")


def extract_bay_plan(sheets: list[SheetView], filename: str = "") -> tuple[list[ExtractedRow], list[dict]]:
    """Extract from GLORY/CONSCIENCE style files.

    Returns (accepted_rows, rejected_rows).
    """
    # Identify Bay Plan sheet vs System Export sheet by data shape
    bay_plan_sheet: SheetView | None = None
    system_export_sheet: SheetView | None = None

    for sheet in sheets:
        if sheet.state == "veryHidden":
            continue
        # Count Container header occurrences in first 10 rows
        max_container_headers = 0
        for r in range(min(10, len(sheet.rows))):
            row = sheet.rows[r]
            count = sum(1 for c in row if is_container_header(c))
            if count > max_container_headers:
                max_container_headers = count

        if max_container_headers >= 3:
            bay_plan_sheet = sheet
        elif max_container_headers == 1:
            system_export_sheet = sheet

    if bay_plan_sheet is None:
        return [], []

    # Vessel name from row 1 cell A1 or from filename
    vessel_name = ""
    if bay_plan_sheet.rows:
        vessel_name = parse_string(bay_plan_sheet.rows[0][0], max_len=255) if bay_plan_sheet.rows[0] else ""
    if not vessel_name:
        vessel_name = _vessel_from_filename(filename)

    # Build F/E lookup from System Export
    fe_lookup = _build_fe_lookup(system_export_sheet)

    # Find header row (row with Container headers)
    header_row_idx = _find_header_row(bay_plan_sheet, 10)
    if header_row_idx is None:
        return [], []

    # Find port section headers — scan all rows above the header
    port_map = _find_port_sections(bay_plan_sheet, header_row_idx)

    # Find Container columns and their associated Size columns
    sections = _map_sections(bay_plan_sheet, header_row_idx, port_map)

    accepted: list[ExtractedRow] = []
    rejected: list[dict] = []

    for section in sections:
        cont_col = section["cont_col"]
        size_col = section["size_col"]
        port = section["port"]

        for r in range(header_row_idx + 1, len(bay_plan_sheet.rows)):
            row = bay_plan_sheet.rows[r]
            cont_val = _cell_text(row[cont_col]) if cont_col < len(row) else ""
            if not cont_val:
                continue

            try:
                cont_no = parse_container_no(cont_val)
            except ValueError:
                rejected.append({"source_row_index": r, "reason": "bad_container_no", "raw": cont_val})
                continue

            size_val = _cell_text(row[size_col]) if size_col is not None and size_col < len(row) else ""
            fe = fe_lookup.get(cont_no, "E")
            work_type = build_cont_type(fe, size_val)

            accepted.append(ExtractedRow(
                container_number=cont_no,
                work_type=work_type,
                pickup="HAIPHONG",
                dropoff=port or "",
                vessel_name=vessel_name,
                source_row_index=r,
            ))

    return accepted, rejected


def _build_fe_lookup(system_export: SheetView | None) -> dict[str, str]:
    """Scan System Export sheet to build container → F/E mapping."""
    if system_export is None:
        return {}

    # Find Container column and F/E column in header row
    header_idx = _find_header_row(system_export, 3)
    if header_idx is None:
        return {}

    header = system_export.rows[header_idx]
    cont_col = None
    fe_col = None

    for c, cell in enumerate(header):
        t = _cell_upper(cell)
        if cont_col is None and ("CONTAINER" in t or "หมายเลขตู้" in t):
            cont_col = c
        if fe_col is None and t in ("F/E", "FE", "F E", "RỖNG/HÀNG", "RONG/HANG",
                                     "HÀNG/RỖNG", "HANG/RONG", "LÕ/HÀNG",
                                     "空/重(E/F)", "空/重"):
            fe_col = c

    if cont_col is None or fe_col is None:
        # Fallback: try scanning known column positions for F/E values
        fe_col = _find_fe_col_by_sampling(system_export, header_idx)
        if cont_col is None or fe_col is None:
            return {}

    lookup: dict[str, str] = {}
    for r in range(header_idx + 1, len(system_export.rows)):
        row = system_export.rows[r]
        cont_val = _cell_text(row[cont_col]) if cont_col < len(row) else ""
        fe_val = _cell_text(row[fe_col]) if fe_col < len(row) else ""
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
                v = _cell_upper(row[c])
                if v in ("E", "F", "H", "R", "EMPTY", "FULL"):
                    fe_count += 1
        if fe_count >= 5:
            return c
    return None


def _find_header_row(sheet: SheetView, max_scan: int) -> int | None:
    """Find the first row with a Container NUMBER header."""
    for r in range(min(max_scan, len(sheet.rows))):
        for cell in sheet.rows[r]:
            if is_container_header(cell):
                return r
    return None


def _find_port_sections(sheet: SheetView, header_row: int) -> dict[int, str]:
    """Find port codes in any row above the header."""
    port_map: dict[int, str] = {}
    if header_row < 1:
        return port_map
    # Scan all rows above the header for port codes
    for r in range(header_row):
        for c, cell in enumerate(sheet.rows[r]):
            t = _cell_text(cell).upper()
            if _PORT_CODE_RE.match(t):
                port_map[c] = t
    return port_map


def _map_sections(
    sheet: SheetView,
    header_row: int,
    port_map: dict[int, str],
) -> list[dict]:
    """Map each Container column to its Size column and port."""
    header = sheet.rows[header_row]
    sections: list[dict] = []

    for c, cell in enumerate(header):
        if not is_container_header(cell):
            continue

        # Find size column within ±5 columns to the right
        size_col = None
        for c2 in range(c, min(c + 6, len(header))):
            h = _cell_upper(header[c2])
            if "KÍCH THƯỚC" in h or "KICH THUOC" in h or h == "SIZE" or h == "SZ":
                size_col = c2
                break

        # Find port for this section (nearest port code to the left)
        port = ""
        sorted_ports = sorted(port_map.keys())
        for pc in sorted_ports:
            if pc <= c:
                port = port_map[pc]
            else:
                break

        sections.append({"cont_col": c, "size_col": size_col, "port": port})

    return sections


# ---------------------------------------------------------------------------
# Loading List  (HAIAN BETA style)
# ---------------------------------------------------------------------------

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
            if "CONTAINERNO" in _cell_upper(cell):
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
        cont_val = _cell_text(row[col_map["container"]]) if col_map.get("container") is not None and col_map["container"] < len(row) else ""
        if not cont_val:
            break  # loading lists end at first empty container cell

        try:
            cont_no = parse_container_no(cont_val)
        except ValueError:
            rejected.append({"source_row_index": r, "reason": "bad_container_no", "raw": cont_val})
            continue

        fe_val = _cell_text(row[col_map["fe"]]) if col_map.get("fe") is not None and col_map["fe"] < len(row) else "E"
        size_val = _cell_text(row[col_map["size"]]) if col_map.get("size") is not None and col_map["size"] < len(row) else ""
        pod = _cell_text(row[col_map["pod"]]) if col_map.get("pod") is not None and col_map["pod"] < len(row) else ""

        size, _ = parse_size_type(size_val)
        work_type = build_cont_type(fe_val, size or size_val)

        accepted.append(ExtractedRow(
            container_number=cont_no,
            work_type=work_type,
            pickup=pickup,
            dropoff=pod,
            vessel_name=vessel_name,
            source_row_index=r,
        ))

    return accepted, rejected


def _find_loading_list_sheet(sheets: list[SheetView]) -> SheetView | None:
    for sheet in sheets:
        if sheet.state == "veryHidden":
            continue
        for r in range(8, min(16, len(sheet.rows))):
            row_text = " ".join(_cell_upper(c) for c in sheet.rows[r])
            if "CONTAINERNO" in row_text and "F/E" in row_text:
                return sheet
    return None


def _map_loading_list_cols(header: list) -> dict[str, int | None]:
    col_map: dict[str, int | None] = {"container": None, "fe": None, "size": None, "pod": None}
    for c, cell in enumerate(header):
        t = _cell_upper(cell)
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
            t = _cell_text(cell).upper()
            if "PORT OF LOADING" in t:
                m = re.search(r"PORT OF LOADING:\s*(.+)", _cell_text(cell), re.IGNORECASE)
                if m:
                    return m.group(1).strip()
                # Value might be in next cell
        row = sheet.rows[r]
        for c, cell in enumerate(row):
            if "PORT OF LOADING" in _cell_text(cell).upper():
                for c2 in range(c + 1, min(c + 5, len(row))):
                    v = _cell_text(row[c2])
                    if v:
                        return v
    return "HAIPHONG"


def _find_vessel_in_header(sheet: SheetView) -> str:
    vessel = ""
    voyage = ""
    for r in range(min(10, len(sheet.rows))):
        row = sheet.rows[r]
        for c, cell in enumerate(row):
            t = _cell_text(cell).upper().strip()
            if "VESSEL" in t and ":" in t and "OPR" not in t:
                # Check same cell
                m = re.search(r"VESSEL:\s*(.+)", _cell_text(cell), re.IGNORECASE)
                if m:
                    vessel = m.group(1).strip()
                else:
                    # Check cells to the right
                    for c2 in range(c + 1, min(c + 5, len(row))):
                        v = _cell_text(row[c2])
                        if v:
                            vessel = v
                            break
            elif t.startswith("VOY") and ":" in t:
                for c2 in range(c + 1, min(c + 5, len(row))):
                    v = _cell_text(row[c2])
                    if v:
                        voyage = v
                        break

    if vessel and voyage:
        return f"{vessel} {voyage}".strip()
    return vessel


# ---------------------------------------------------------------------------
# Invoice  (Phúc Lộc Shipside style)
# ---------------------------------------------------------------------------

def extract_invoice(sheets: list[SheetView], filename: str = "") -> tuple[list[ExtractedRow], list[dict]]:
    """Extract from Phúc Lộc Shipside Invoice."""
    sheet = _find_invoice_sheet(sheets)
    if sheet is None:
        return [], []

    # Find header row with SỐCONT
    header_idx = None
    for r in range(11, min(25, len(sheet.rows))):
        for cell in sheet.rows[r]:
            t = _cell_text(cell).upper()
            if "SỐCONT" in t or "SOCONT" in t or "SO CONT" in t:
                header_idx = r
                break
        if header_idx is not None:
            break

    if header_idx is None:
        return [], []

    header = sheet.rows[header_idx]
    col_map = _map_invoice_cols(header)

    accepted: list[ExtractedRow] = []
    rejected: list[dict] = []

    for r in range(header_idx + 1, len(sheet.rows)):
        row = sheet.rows[r]
        cont_col = col_map.get("container", 1)
        cont_val = _cell_text(row[cont_col]) if cont_col < len(row) else ""
        if not cont_val:
            break

        try:
            cont_no = parse_container_no(cont_val)
        except ValueError:
            rejected.append({"source_row_index": r, "reason": "bad_container_no", "raw": cont_val})
            continue

        size_col = col_map.get("size", 2)
        size_val = _cell_text(row[size_col]) if size_col < len(row) else ""

        hr_col = col_map.get("hr", 3)
        hr_val = _cell_text(row[hr_col]) if hr_col < len(row) else ""
        fe = "F" if hr_val.upper() in ("H", "HÀNG", "HANG") else "E"

        vessel_col = col_map.get("vessel", 4)
        vessel_val = _cell_text(row[vessel_col]) if vessel_col is not None and vessel_col < len(row) else ""

        voyage_col = col_map.get("voyage")
        voyage_val = _cell_text(row[voyage_col]) if voyage_col is not None and voyage_col < len(row) else ""
        if vessel_val and voyage_val:
            vessel_val = f"{vessel_val} {voyage_val}".strip()

        pickup_col = col_map.get("pickup")
        pickup = _cell_text(row[pickup_col]) if pickup_col is not None and pickup_col < len(row) else ""

        dropoff_col = col_map.get("dropoff")
        dropoff = _cell_text(row[dropoff_col]) if dropoff_col is not None and dropoff_col < len(row) else ""

        work_type = build_cont_type(fe, size_val)

        accepted.append(ExtractedRow(
            container_number=cont_no,
            work_type=work_type,
            pickup=pickup,
            dropoff=dropoff,
            vessel_name=vessel_val,
            source_row_index=r,
        ))

    return accepted, rejected


def _find_invoice_sheet(sheets: list[SheetView]) -> SheetView | None:
    for sheet in sheets:
        if sheet.state == "veryHidden":
            continue
        for r in range(11, min(25, len(sheet.rows))):
            row_text = " ".join(_cell_upper(c) for c in sheet.rows[r])
            if ("SỐCONT" in row_text or "SOCONT" in row_text) and "H/R" in row_text:
                return sheet
    return None


def _map_invoice_cols(header: list) -> dict[str, int]:
    col_map: dict[str, int] = {}
    for c, cell in enumerate(header):
        t = _cell_text(cell).upper()
        if "SỐCONT" in t or "SOCONT" in t or "SO CONT" in t:
            col_map["container"] = c
        elif "LOẠI" in t or t == "LOAI":
            col_map["size"] = c
        elif "H/R" in t or t == "HR":
            col_map["hr"] = c
        elif "TÀU" in t or t == "TAU":
            col_map["vessel"] = c
        elif "CHUYẾN" in t or "CHUYEN" in t:
            col_map["voyage"] = c
        elif "NƠI LẤY" in t or "NOI LAY" in t:
            col_map["pickup"] = c
        elif "NƠI TRẢ" in t or "NOI TRA" in t:
            col_map["dropoff"] = c
    return col_map


# ---------------------------------------------------------------------------
# Utility
# ---------------------------------------------------------------------------

def _cell_text(cell) -> str:
    if cell is None:
        return ""
    return str(cell).strip()


def _cell_upper(cell) -> str:
    return _cell_text(cell).upper()


def _vessel_from_filename(filename: str) -> str:
    """Try to extract a vessel name from the filename."""
    base = os.path.basename(filename)
    # Remove extension and leading numbers/dots
    name = os.path.splitext(base)[0]
    name = re.sub(r"^[\d.]+\s*", "", name)
    # Remove trailing voyage codes like "2612N", "2615N", "062S"
    name = re.sub(r"\s+\d{3,4}[NSWE]$", "", name, flags=re.IGNORECASE)
    return name.strip()
