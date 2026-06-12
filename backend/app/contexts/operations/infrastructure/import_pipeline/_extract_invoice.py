"""Invoice extractor (Phúc Lộc Shipside style)."""

from __future__ import annotations

from app.contexts.operations.infrastructure.import_pipeline._extractor_common import (
    ExtractedRow,
    cell_text,
    cell_upper,
)
from app.contexts.operations.infrastructure.import_pipeline.value_parsers import (
    build_cont_type,
    parse_container_no,
)
from app.contexts.operations.infrastructure.import_pipeline.workbook import SheetView


def extract_invoice(sheets: list[SheetView], filename: str = "") -> tuple[list[ExtractedRow], list[dict]]:
    """Extract from Phúc Lộc Shipside Invoice."""
    sheet = _find_invoice_sheet(sheets)
    if sheet is None:
        return [], []

    # Find header row with SỐCONT
    header_idx = None
    for r in range(11, min(25, len(sheet.rows))):
        for cell in sheet.rows[r]:
            t = cell_text(cell).upper()
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
        cont_val = cell_text(row[cont_col]) if cont_col < len(row) else ""
        if not cont_val:
            break

        try:
            cont_no = parse_container_no(cont_val)
        except ValueError:
            rejected.append({"source_row_index": r, "reason": "bad_container_no", "raw": cont_val})
            continue

        size_col = col_map.get("size", 2)
        size_val = cell_text(row[size_col]) if size_col < len(row) else ""

        hr_col = col_map.get("hr", 3)
        hr_val = cell_text(row[hr_col]) if hr_col < len(row) else ""
        fe = "F" if hr_val.upper() in ("H", "HÀNG", "HANG") else "E"

        vessel_col = col_map.get("vessel", 4)
        vessel_val = cell_text(row[vessel_col]) if vessel_col is not None and vessel_col < len(row) else ""

        voyage_col = col_map.get("voyage")
        voyage_val = cell_text(row[voyage_col]) if voyage_col is not None and voyage_col < len(row) else ""
        if vessel_val and voyage_val:
            vessel_val = f"{vessel_val} {voyage_val}".strip()

        pickup_col = col_map.get("pickup")
        pickup = cell_text(row[pickup_col]) if pickup_col is not None and pickup_col < len(row) else ""

        dropoff_col = col_map.get("dropoff")
        dropoff = cell_text(row[dropoff_col]) if dropoff_col is not None and dropoff_col < len(row) else ""

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


# ---------------------------------------------------------------------------
# Private helpers
# ---------------------------------------------------------------------------

def _find_invoice_sheet(sheets: list[SheetView]) -> SheetView | None:
    for sheet in sheets:
        if sheet.state == "veryHidden":
            continue
        for r in range(11, min(25, len(sheet.rows))):
            row_text = " ".join(cell_upper(c) for c in sheet.rows[r])
            if ("SỐCONT" in row_text or "SOCONT" in row_text) and "H/R" in row_text:
                return sheet
    return None


def _map_invoice_cols(header: list) -> dict[str, int]:
    col_map: dict[str, int] = {}
    for c, cell in enumerate(header):
        t = cell_text(cell).upper()
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
