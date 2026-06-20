"""Settlement List extractor (BẢNG KÊ QUYẾT TOÁN — Vietnamese reconciliation)."""

from __future__ import annotations

from datetime import date

from app.contexts.operations.infrastructure.import_pipeline._extractor_common import (
    ExtractedRow,
    cell_text,
    cell_upper,
    is_container_header,
    _SETTLEMENT_WT_HEADERS,
)
from app.contexts.operations.infrastructure.import_pipeline.value_parsers import (
    parse_container_no,
    parse_date,
    parse_money,
    parse_plate,
    parse_string,
)
from app.contexts.operations.infrastructure.import_pipeline.workbook import SheetView


def extract_settlement_list(
    sheets: list[SheetView], filename: str = ""
) -> tuple[list[ExtractedRow], list[dict]]:
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
        cont_val = cell_text(row[cont_col]) if cont_col < len(row) else ""

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
            rejected.append(
                {"source_row_index": r, "reason": "bad_container_no", "raw": cont_val}
            )
            continue

        # Determine container type from pivoted columns
        work_type = _detect_work_type_from_pivot(row, col_map)

        # Read work type (Tác nghiệp) from dedicated column — preserve
        # the original value exactly as in the Excel (no uppercasing, no
        # diacritic stripping).  Normalization is only for DB matching,
        # done during the commit step.
        op_val = ""
        if col_map.get("operation") is not None and col_map["operation"] < len(row):
            op_val = cell_text(row[col_map["operation"]]).strip()
        work_type_val = op_val or "CHUYỂN BÃI"

        trip_date: date | None = None
        if col_map.get("date") is not None and col_map["date"] < len(row):
            trip_date = parse_date(row[col_map["date"]])

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
            plate = parse_plate(row[col_map["plate"]])

        amount = None
        if col_map.get("amount") is not None and col_map["amount"] < len(row):
            amount = parse_money(row[col_map["amount"]])

        vessel_name = ""
        if col_map.get("vessel") is not None and col_map["vessel"] < len(row):
            vessel_name = parse_string(row[col_map["vessel"]], max_len=255)

        accepted.append(
            ExtractedRow(
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
                trip_date=trip_date,
            )
        )

    return accepted, rejected


# ---------------------------------------------------------------------------
# Private helpers
# ---------------------------------------------------------------------------


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
                clean = cell_upper(cell).strip().rstrip("'\"")
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
        "container": None,
        "date": None,
        "consignee": None,
        "f20": None,
        "f40": None,
        "e20": None,
        "e40": None,
        "plate": None,
        "pickup": None,
        "dropoff": None,
        "amount": None,
        "notes": None,
        "operation": None,
        "vessel": None,
    }

    for c, cell in enumerate(header):
        t = cell_upper(cell)
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
        elif (
            "TÊN TÀU" in t
            or "TEN TAU" in t
            or "TÊN TẦU" in t
            or "SỐ TÀU" in t
            or "SO TAU" in t
            or "HÃNG KHAI THÁC" in t
            or "HANG KHAITHAC" in t
            or "HANG KHAI THAC" in t
        ):
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
