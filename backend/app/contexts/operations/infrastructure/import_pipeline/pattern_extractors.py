"""Pattern-specific extractors for known shipping Excel formats.

Each extractor reads a list[SheetView] and returns flat rows in the same
shape that ``pipeline._parse_row`` produces, plus a vessel_name string.
They reuse ``value_parsers`` for normalisation so validation is consistent.
"""

from __future__ import annotations

import os
import re
from dataclasses import dataclass

from app.contexts.operations.infrastructure.import_pipeline.value_parsers import (
    build_cont_type,
    parse_container_no,
    parse_date,
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
    cont_type: str              # E20, E40, F20, F40 (container type code)
    pickup: str
    dropoff: str
    vessel_name: str
    source_row_index: int       # 0-based row in the sheet
    work_type: str = "CHUYỂN BÃI"  # Operation type: CHUYỂN BÃI, XUẤT/NHẬP TÀU, etc.
    consignee: str = ""
    vehicle_plate: str = ""
    freight_charge: float | None = None
    freight_kind_unknown: bool = False  # True if container E/F kind was not explicitly found


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
            fe_unknown = cont_no not in fe_lookup
            fe = fe_lookup.get(cont_no, "E")
            work_type = build_cont_type(fe, size_val)

            accepted.append(ExtractedRow(
                container_number=cont_no,
                cont_type=work_type,
                pickup="HAIPHONG",
                dropoff=port or "",
                vessel_name=vessel_name,
                source_row_index=r,
                freight_kind_unknown=fe_unknown,
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
# Dual Panel  (side-by-side tables)
# ---------------------------------------------------------------------------

def extract_dual_panel(sheets: list[SheetView], filename: str = "") -> tuple[list[ExtractedRow], list[dict]]:
    """Extract from Dual Panel (side-by-side 40HC + 20GP tables).

    Layout: [STT | Số cont | Vị trí | Size | <gap> | STT | Số cont | Vị trí | Size]
    Section headers above may indicate size (e.g., "40HC", "20GP").
    """
    sheet = None
    for s in sheets:
        if s.state != "veryHidden":
            from app.contexts.operations.infrastructure.import_pipeline.pattern_detector import _score_dual_panel
            if _score_dual_panel(s) >= 0.6:
                sheet = s
                break
    if not sheet:
        return [], []

    vessel_name = _vessel_from_filename(filename)

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
    right_size = _find_nearby_size_col(header, right_cont, len(header) if header else 999)

    # Check section header rows above for size hints (e.g., "40HC", "20GP")
    left_size_hint = _find_section_size(sheet, header_idx, 0, right_cont)
    right_size_hint = _find_section_size(sheet, header_idx, right_cont, len(header) if header else 999)

    accepted: list[ExtractedRow] = []
    rejected: list[dict] = []

    for r in range(header_idx + 1, len(sheet.rows)):
        row = sheet.rows[r]
        # Left panel
        _extract_panel_row(row, r, left_cont, left_size, left_size_hint,
                           vessel_name, accepted, rejected)
        # Right panel
        _extract_panel_row(row, r, right_cont, right_size, right_size_hint,
                           vessel_name, accepted, rejected)

    return accepted, rejected


def _find_nearby_size_col(header: list, cont_col: int, boundary: int) -> int | None:
    """Find a Size column within the panel (cont_col to boundary)."""
    for c in range(cont_col, min(boundary, len(header))):
        t = _cell_upper(header[c])
        if "KÍCH THƯỚC" in t or "SIZE" in t or "SZ" in t or "KICH THUOC" in t:
            return c
    return None


def _find_section_size(sheet: SheetView, header_idx: int, col_start: int, col_end: int) -> str:
    """Look for section headers like '40HC' or '20GP' above the header row."""
    for r in range(max(0, header_idx - 3), header_idx):
        row = sheet.rows[r]
        for c in range(col_start, min(col_end, len(row))):
            t = _cell_upper(row[c])
            if re.match(r"^(20|40)(?:HC|GP|DC|RF|'|$)", t):
                return t.strip()
    return ""


def _extract_panel_row(
    row, row_idx: int, cont_col: int, size_col: int | None,
    size_hint: str, vessel_name: str,
    accepted: list[ExtractedRow], rejected: list[dict],
) -> None:
    """Extract a container from one panel of a dual-panel row."""
    cont_val = _cell_text(row[cont_col]) if cont_col < len(row) else ""
    if not cont_val:
        return

    try:
        cont_no = parse_container_no(cont_val)
    except ValueError:
        rejected.append({"source_row_index": row_idx, "reason": "bad_container_no", "raw": cont_val})
        return

    # Get size from column or section hint
    size_val = ""
    if size_col is not None and size_col < len(row):
        size_val = _cell_text(row[size_col])
    if not size_val and size_hint:
        size_val = size_hint

    work_type = build_cont_type("E", size_val)

    accepted.append(ExtractedRow(
        container_number=cont_no,
        cont_type=work_type,
        pickup="",
        dropoff="",
        vessel_name=vessel_name,
        source_row_index=row_idx,
        freight_kind_unknown=True,  # Hardcoded to E, not explicitly provided
    ))


# ---------------------------------------------------------------------------
# Stacking Plan  (depot gate-out / bay arrangement)
# ---------------------------------------------------------------------------

def extract_stacking_plan(sheets: list[SheetView], filename: str = "") -> tuple[list[ExtractedRow], list[dict]]:
    """Extract from Stacking Plan (depot format).

    Handles simple stacking plans with a single container column.
    Cross-references EIR/System Export sheets for F/E data when available.
    Defaults F/E to E (empty) when no cross-reference found.
    """
    # Find stacking plan sheet and collect other sheets for F/E lookup
    sheet = None
    other_sheets: list[SheetView] = []
    for s in sheets:
        if s.state == "veryHidden":
            continue
        if sheet is None:
            from app.contexts.operations.infrastructure.import_pipeline.pattern_detector import _score_stacking_plan
            if _score_stacking_plan(s) >= 0.6:
                sheet = s
                continue
        other_sheets.append(s)
    if not sheet:
        return [], []

    vessel_name = _vessel_from_filename(filename)

    # Build F/E lookup from other sheets (EIR log, system export)
    fe_lookup: dict[str, str] = {}
    for other in other_sheets:
        lookup = _build_fe_lookup(other)
        if lookup:
            fe_lookup = lookup
            break

    # Find header row with container + size/position columns
    header_idx = None
    cont_col = None
    size_col = None
    pos_col = None

    for r in range(min(15, len(sheet.rows))):
        row = sheet.rows[r]
        for c, cell in enumerate(row):
            t = _cell_upper(cell)
            if is_container_header(cell):
                cont_col = c
            elif "KÍCH THƯỚC" in t or "SIZE" in t or "SZ" in t or "KICH THUOC" in t:
                size_col = c
            elif "VỊ TRÍ" in t or "VI TRI" in t or "VITRI" in t:
                pos_col = c
        if cont_col is not None and (size_col is not None or pos_col is not None):
            header_idx = r
            break

    if header_idx is None:
        return [], []

    accepted: list[ExtractedRow] = []
    rejected: list[dict] = []

    for r in range(header_idx + 1, len(sheet.rows)):
        row = sheet.rows[r]
        cont_val = _cell_text(row[cont_col]) if cont_col is not None and cont_col < len(row) else ""
        if not cont_val:
            continue

        try:
            cont_no = parse_container_no(cont_val)
        except ValueError:
            rejected.append({"source_row_index": r, "reason": "bad_container_no", "raw": cont_val})
            continue

        size_val = _cell_text(row[size_col]) if size_col is not None and size_col < len(row) else ""
        pos_val = _cell_text(row[pos_col]) if pos_col is not None and pos_col < len(row) else ""

        fe_unknown = cont_no not in fe_lookup
        fe = fe_lookup.get(cont_no, "E")
        work_type = build_cont_type(fe, size_val)

        accepted.append(ExtractedRow(
            container_number=cont_no,
            cont_type=work_type,
            pickup=pos_val,
            dropoff="",
            vessel_name=vessel_name,
            source_row_index=r,
            freight_kind_unknown=fe_unknown,
        ))

    return accepted, rejected


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
            cont_type=work_type,
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
            cont_type=work_type,
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
# Settlement List  (BẢNG KÊ QUYẾT TOÁN — Vietnamese reconciliation)
# ---------------------------------------------------------------------------

_SETTLEMENT_WT_HEADERS = {"F20", "F40", "E20", "E40"}


def extract_settlement_list(sheets: list[SheetView], filename: str = "") -> tuple[list[ExtractedRow], list[dict]]:
    """Extract from BẢNG KÊ QUYẾT TOÁN format with pivoted work-type columns.

    Each data row has 1 in one of the F20'/F40'/E20'/E40' columns and None in
    the others. The work_type is inferred from which column has the 1.
    """
    sheet = _find_settlement_list_sheet(sheets)
    if sheet is None:
        return [], []

    header_idx = _find_settlement_header(sheet)
    if header_idx is None:
        return [], []

    header = sheet.rows[header_idx]
    col_map = _map_settlement_cols(header)

    if col_map.get("container") is None:
        return [], []

    accepted: list[ExtractedRow] = []
    rejected: list[dict] = []

    for r in range(header_idx + 1, len(sheet.rows)):
        row = sheet.rows[r]
        cont_col = col_map["container"]
        cont_val = _cell_text(row[cont_col]) if cont_col < len(row) else ""

        # Skip sub-total / summary rows (numeric in container col or empty)
        if not cont_val:
            # Check if row has any numeric data (sub-total) — skip it
            if r == header_idx + 1:
                continue
            # Empty row after data — stop
            break

        # Skip rows where container column is a number (sub-totals)
        try:
            float(cont_val)
            continue
        except ValueError:
            pass

        try:
            cont_no = parse_container_no(cont_val)
        except ValueError:
            rejected.append({"source_row_index": r, "reason": "bad_container_no", "raw": cont_val})
            continue

        # Determine container type from pivoted columns
        work_type = _detect_work_type_from_pivot(row, col_map)

        # Read work type (Tác nghiệp) from dedicated column
        work_type_val = "CHUYỂN BÃI"
        if col_map.get("operation") is not None and col_map["operation"] < len(row):
            op_val = _cell_text(row[col_map["operation"]]).strip().upper()
            if op_val:
                work_type_val = _normalize_work_type(op_val)

        if col_map.get("date") is not None and col_map["date"] < len(row):
            parse_date(row[col_map["date"]])

        pickup = ""
        if col_map.get("pickup") is not None and col_map["pickup"] < len(row):
            pickup = parse_string(row[col_map["pickup"]], max_len=255)

        dropoff = ""
        if col_map.get("dropoff") is not None and col_map["dropoff"] < len(row):
            dropoff = parse_string(row[col_map["dropoff"]], max_len=255)
            
        consignee = ""
        if col_map.get("consignee") is not None and col_map["consignee"] < len(row):
            consignee = parse_string(row[col_map["consignee"]], max_len=255)
            
        plate = ""
        if col_map.get("plate") is not None and col_map["plate"] < len(row):
            from app.contexts.operations.infrastructure.import_pipeline.value_parsers import parse_plate
            plate = parse_plate(row[col_map["plate"]])
            
        amount = None
        if col_map.get("amount") is not None and col_map["amount"] < len(row):
            raw_amt = row[col_map["amount"]]
            if raw_amt is not None and str(raw_amt).strip():
                try:
                    cleaned_fc = re.sub(r"[^\d.,\-]", "", str(raw_amt))
                    if "," in cleaned_fc and "." in cleaned_fc:
                        if cleaned_fc.rfind(".") > cleaned_fc.rfind(","):
                            cleaned_fc = cleaned_fc.replace(",", "")
                        else:
                            cleaned_fc = cleaned_fc.replace(".", "").replace(",", ".")
                    elif "," in cleaned_fc:
                        cleaned_fc = cleaned_fc.replace(",", "")
                    amount = float(cleaned_fc) if cleaned_fc else None
                except ValueError:
                    pass

        vessel_name = ""
        if col_map.get("vessel") is not None and col_map["vessel"] < len(row):
            vessel_name = parse_string(row[col_map["vessel"]], max_len=255)

        accepted.append(ExtractedRow(
            container_number=cont_no,
            cont_type=work_type,
            pickup=pickup,
            dropoff=dropoff,
            vessel_name=vessel_name,
            source_row_index=r,
            work_type=work_type_val,
            consignee=consignee,
            vehicle_plate=plate,
            freight_charge=amount,
        ))

    return accepted, rejected


def _find_settlement_list_sheet(sheets: list[SheetView]) -> SheetView | None:
    """Find the sheet with SỐCONTAINER header + F20/F40/E20/E40 columns."""
    for sheet in sheets:
        if sheet.state == "veryHidden":
            continue
        has_socont = False
        wt_count = 0
        for r in range(min(15, len(sheet.rows))):
            row = sheet.rows[r]
            row_has_socont = False
            for cell in row:
                if is_container_header(cell):
                    row_has_socont = True
                clean = _cell_upper(cell).strip().rstrip("'\"")
                if clean in _SETTLEMENT_WT_HEADERS:
                    wt_count += 1
            if row_has_socont:
                has_socont = True
        if has_socont and wt_count >= 2:
            return sheet
    return None


def _find_settlement_header(sheet: SheetView) -> int | None:
    """Find the header row containing SỐCONTAINER."""
    for r in range(min(15, len(sheet.rows))):
        for cell in sheet.rows[r]:
            if is_container_header(cell):
                return r
    return None


def _map_settlement_cols(header: list) -> dict[str, int | None]:
    """Map column positions from the header row."""
    col_map: dict[str, int | None] = {
        "container": None, "date": None, "consignee": None,
        "f20": None, "f40": None, "e20": None, "e40": None,
        "plate": None, "pickup": None, "dropoff": None,
        "amount": None, "notes": None, "operation": None,
        "vessel": None,
    }

    for c, cell in enumerate(header):
        t = _cell_upper(cell)
        clean = t.strip().rstrip("'\"").rstrip("\n").rstrip()

        if is_container_header(cell):
            col_map["container"] = c
        elif "NGÀY ĐI" in t or "NGAY DI" in t or t == "NGÀY" or t == "NGAY":
            col_map["date"] = c
        elif "CHỦ HÀNG" in t or "CHU HANG" in t:
            col_map["consignee"] = c
        elif clean == "F20":
            col_map["f20"] = c
        elif clean == "F40":
            col_map["f40"] = c
        elif clean == "E20":
            col_map["e20"] = c
        elif clean == "E40":
            col_map["e40"] = c
        elif "XE" in t and ("CHẠY" in t or "CHAY" in t or "CHẠY" in t):
            col_map["plate"] = c
        elif "ĐIỂM ĐI" in t or "DIEM DI" in t:
            col_map["pickup"] = c
        elif "ĐIỂM ĐẾN" in t or "DIEM DEN" in t:
            col_map["dropoff"] = c
        elif "CƯỚC" in t and ("CHUYẾN" in t or "CHUYEN" in t):
            col_map["amount"] = c
        elif "TÁC NGHIỆP" in t or "TAC NGHIEP" in t:
            col_map["operation"] = c
        elif "GHI" in t and ("CHÚ" in t or "CHU" in t):
            col_map["notes"] = c
        elif "TÊN TẦU" in t or "TEN TAU" in t or "TÊN TÀU" in t or "TEN TAU" in t.upper():
            col_map["vessel"] = c

    return col_map


def _detect_work_type_from_pivot(row: list, col_map: dict[str, int | None]) -> str:
    """Determine work_type (F20/F40/E20/E40) from pivoted count columns.

    Each row has a numeric value (typically 1) in exactly one of the
    F20/F40/E20/E40 columns and None/0 in the others.
    """
    for wt_name in ("f20", "f40", "e20", "e40"):
        col = col_map.get(wt_name)
        if col is not None and col < len(row):
            val = row[col]
            if val is not None:
                try:
                    if float(val) > 0:
                        return wt_name.upper()
                except (ValueError, TypeError):
                    pass
    return "E20"  # default fallback


# ---------------------------------------------------------------------------
# Utility
# ---------------------------------------------------------------------------

def _normalize_work_type(value: str) -> str:
    """Normalize operation type value to canonical form."""
    import unicodedata
    norm = value.strip().upper()
    # Strip diacritics for matching
    folded = unicodedata.normalize("NFD", norm)
    folded = "".join(c for c in folded if not unicodedata.combining(c))
    folded = folded.replace("Đ", "D").replace("đ", "d")
    if "CHUYEN BAI" in folded or "CHUYỂN BÃI" in norm:
        return "CHUYỂN BÃI"
    if "XUAT" in folded or "NHAP" in folded or "TAU" in folded:
        return "XUẤT/NHẬP TÀU"
    if "LAY VO" in folded or "HA HANG" in folded:
        return "LẤY VỎ HẠ HÀNG"
    if "DONG KHO" in folded or "ĐÓNG KHO" in norm:
        return "ĐÓNG KHO"
    if "SA LAN" in folded or "SÀ LAN" in norm:
        return "CHẠY SÀ LAN"
    return norm or "CHUYỂN BÃI"


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
