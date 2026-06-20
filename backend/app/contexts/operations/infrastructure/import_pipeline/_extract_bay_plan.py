"""Bay Plan extractor (GLORY SHANGHAI / CONSCIENCE style)."""

from __future__ import annotations

from app.contexts.operations.infrastructure.import_pipeline._extractor_common import (
    ExtractedRow,
    build_fe_lookup,
    cell_text,
    cell_upper,
    find_header_row,
    is_container_header,
    vessel_from_filename,
    _PORT_CODE_RE,
)
from app.contexts.operations.infrastructure.import_pipeline.value_parsers import (
    build_cont_type,
    parse_container_no,
    parse_string,
)
from app.contexts.operations.infrastructure.import_pipeline.workbook import SheetView


def extract_bay_plan(
    sheets: list[SheetView], filename: str = ""
) -> tuple[list[ExtractedRow], list[dict]]:
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
        vessel_name = (
            parse_string(bay_plan_sheet.rows[0][0], max_len=255)
            if bay_plan_sheet.rows[0]
            else ""
        )
    if not vessel_name:
        vessel_name = vessel_from_filename(filename)

    # Build F/E lookup from System Export
    fe_lookup = build_fe_lookup(system_export_sheet)

    # Find header row (row with Container headers)
    header_row_idx = find_header_row(bay_plan_sheet, 10)
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
            cont_val = cell_text(row[cont_col]) if cont_col < len(row) else ""
            if not cont_val:
                continue

            try:
                cont_no = parse_container_no(cont_val)
            except ValueError:
                rejected.append(
                    {
                        "source_row_index": r,
                        "reason": "bad_container_no",
                        "raw": cont_val,
                    }
                )
                continue

            size_val = (
                cell_text(row[size_col])
                if size_col is not None and size_col < len(row)
                else ""
            )
            fe_unknown = cont_no not in fe_lookup
            fe = fe_lookup.get(cont_no, "E")
            work_type = build_cont_type(fe, size_val)

            accepted.append(
                ExtractedRow(
                    container_number=cont_no,
                    cont_type=work_type,
                    pickup="HAIPHONG",
                    dropoff=port or "",
                    vessel_name=vessel_name,
                    source_row_index=r,
                    freight_kind_unknown=fe_unknown,
                )
            )

    return accepted, rejected


# ---------------------------------------------------------------------------
# Private helpers
# ---------------------------------------------------------------------------


def _find_port_sections(sheet: SheetView, header_row: int) -> dict[int, str]:
    """Find port codes in any row above the header."""
    port_map: dict[int, str] = {}
    if header_row < 1:
        return port_map
    # Scan all rows above the header for port codes
    for r in range(header_row):
        for c, cell in enumerate(sheet.rows[r]):
            t = cell_text(cell).upper()
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
            h = cell_upper(header[c2])
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
