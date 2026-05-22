from __future__ import annotations

import io
from datetime import date, datetime

from app.utils.excel_utils import (
    CONTAINER_RE,
    looks_like_container,
    parse_date,
)


def _parse_vendor_excel(content: bytes, filename: str) -> list[dict]:
    try:
        import openpyxl
    except ImportError:
        raise RuntimeError("openpyxl is required for Excel parsing")

    wb = openpyxl.load_workbook(io.BytesIO(content), data_only=True, read_only=True)

    parsed: list[dict] = []

    for sheet in wb.worksheets:
        rows = list(sheet.iter_rows(values_only=True))
        if not rows:
            continue

        data_start = None
        for idx, row in enumerate(rows):
            if any(looks_like_container(cell) for cell in row):
                data_start = idx
                break

        if data_start is None:
            continue

        for row in rows[data_start:]:
            cells = [c for c in row]
            if not any(looks_like_container(c) for c in cells):
                continue

            container = None
            trip_date = None
            vendor_amount = None
            other_texts: list[str] = []

            for c in cells:
                if c is None:
                    continue
                if looks_like_container(c) and container is None:
                    m = CONTAINER_RE.search(str(c).upper().replace(" ", ""))
                    if m:
                        container = m.group(0)
                elif isinstance(c, (date, datetime)) and trip_date is None:
                    trip_date = parse_date(c)
                elif isinstance(c, (int, float)) and vendor_amount is None:
                    if c > 0:
                        vendor_amount = int(c)
                elif isinstance(c, str):
                    stripped = c.strip()
                    d = parse_date(stripped)
                    if d and trip_date is None:
                        trip_date = d
                    elif stripped and stripped not in (container or ""):
                        other_texts.append(stripped)

            if container:
                route_text = " | ".join(other_texts[:3]) if other_texts else None
                parsed.append(
                    {
                        "container_number": container,
                        "work_type": None,
                        "route_text": route_text,
                        "trip_date": trip_date.isoformat() if trip_date else None,
                        "vendor_amount": vendor_amount,
                    }
                )
        break

    wb.close()
    return parsed
