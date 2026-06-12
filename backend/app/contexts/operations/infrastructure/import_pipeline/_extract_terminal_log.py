"""Terminal Log extractor (BDST / VIPI style — fixed-position columns)."""

from __future__ import annotations

import re
from datetime import date

from app.contexts.operations.infrastructure.import_pipeline._extractor_common import (
    ExtractedRow,
    cell_text,
    cell_upper,
)
from app.contexts.operations.infrastructure.import_pipeline.value_parsers import (
    build_cont_type,
    parse_container_no,
    parse_container_size,
    parse_date,
    parse_freight_kind,
)


def extract_terminal_log(rows: list[list]) -> tuple[list[ExtractedRow], list[dict]]:
    """Extract from BDST/VIPI terminal operations log.

    Layout (column positions are constant):
      Col 1: So Container
      Col 2: Hang khai thac (shipping line) -> vessel_name proxy
      Col 3: Kich co ISO (e.g. 45G0, 22G0) -> cont_type
      Col 4: F/E (full/empty)
      Col 5: Nhap/xuat (informational)
      Col 6: Loai cong viec (Do tau / Xep tau) -> work_type
      Col 14: datetime -> trip_date

    Returns (accepted_rows, rejected_rows).
    """
    # 1. Find header row (first row containing "container" text)
    header_idx: int | None = None
    for r, row in enumerate(rows):
        for cell in row:
            if "CONTAINER" in cell_upper(cell):
                header_idx = r
                break
        if header_idx is not None:
            break

    if header_idx is None:
        return [], []

    accepted: list[ExtractedRow] = []
    rejected: list[dict] = []

    # 2. Iterate data rows after header
    for r in range(header_idx + 1, len(rows)):
        row = rows[r]

        # Parse container number (col 1)
        cont_val = cell_text(row[1]) if len(row) > 1 else ""
        if not cont_val:
            continue

        try:
            cont_no = parse_container_no(cont_val)
        except ValueError:
            rejected.append({"source_row_index": r, "reason": "bad_container_no", "raw": cont_val})
            continue

        # Parse shipping line -> vessel_name proxy (col 2)
        shipping_line = cell_text(row[2]) if len(row) > 2 else ""

        # Parse ISO size -> cont_type (col 3)
        iso_size = cell_text(row[3]) if len(row) > 3 else ""
        try:
            size = parse_container_size(None, iso_hint=iso_size)
        except ValueError:
            # Fallback: try to parse the leading digits directly
            size = _fallback_iso_size(iso_size)

        # Parse F/E (col 4)
        fe_val = cell_text(row[4]) if len(row) > 4 else "E"
        try:
            fe = parse_freight_kind(fe_val)
        except ValueError:
            fe = "E"

        # Build cont_type from F/E and size
        cont_type = build_cont_type(fe, size or iso_size)

        # Parse work type (col 6)
        work_type_raw = cell_text(row[6]) if len(row) > 6 else ""
        work_type = work_type_raw if work_type_raw else "CHUYỂN BÃI"

        # Parse trip_date from datetime column (col 14)
        trip_date: date | None = None
        if len(row) > 14:
            trip_date = parse_date(row[14])

        # 4. Skip rows without container_number or trip_date
        if not cont_no or trip_date is None:
            rejected.append({
                "source_row_index": r,
                "reason": "missing_container_or_date",
                "raw": cont_val,
            })
            continue

        accepted.append(ExtractedRow(
            container_number=cont_no,
            cont_type=cont_type,
            pickup="",
            dropoff="",
            vessel_name=shipping_line,
            source_row_index=r,
            work_type=work_type,
            trip_date=trip_date,
        ))

    return accepted, rejected


# ---------------------------------------------------------------------------
# Private helpers
# ---------------------------------------------------------------------------

def _fallback_iso_size(iso_code: str) -> str | None:
    """Fallback size parser for non-standard ISO codes like L5G0."""
    s = iso_code.strip().upper()
    if not s:
        return None
    # Handle OCR-like errors: L->4, O->0
    m = re.match(r"^([0-9L])([0-9])", s)
    if m:
        lead = m.group(1)
        if lead == "L":
            lead = "4"
        n = int(lead + m.group(2))
        if n in (20, 22):
            return "20"
        if n in (40, 42, 45):
            return "40"
    return None
