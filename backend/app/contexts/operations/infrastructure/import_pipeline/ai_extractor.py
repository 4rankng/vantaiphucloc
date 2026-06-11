"""AI-powered fallback extraction for unparseable shipping Excel files.

When no known pattern matches and the generic pipeline fails, this module
sends the raw sheet data to Gemini for extraction.  Uses the same Gemini
API infrastructure as ``llm.py``.
"""

from __future__ import annotations

import json
import logging
import re

from app.contexts.operations.infrastructure.import_pipeline.pattern_extractors import ExtractedRow
from app.contexts.operations.infrastructure.import_pipeline.value_parsers import (
    parse_container_no,
)
from app.contexts.operations.infrastructure.import_pipeline.workbook import SheetView

_logger = logging.getLogger(__name__)

_EXTRACT_PROMPT = """\
You are an expert data extractor for a Vietnamese container trucking company (vận tải container).
Extract container trip records from this spreadsheet data.

CONTEXT:
- This is a shipping/logistics document from Vietnam
- Data may have Vietnamese headers, locations, and company names
- The document may contain: loading lists, bay plans, invoices, or settlement sheets
- Headers may be on row 0, 1, 2, or even row 5+ (skip title/logo rows)
- Summary rows (containing CỘNG, TỔNG, TOTAL, SUM) are NOT data — skip them
- Merged header cells may span multiple rows — look at the data pattern, not just one row

FIELDS TO EXTRACT:
- container_number: ISO 6346 format, 4 uppercase letters + 7 digits (e.g. TCNU2473728).
  Must match pattern [A-Z]{4}[0-9]{7}. Skip rows without a valid container number.
- cont_type: One of E20, E40, F20, F40.
  E = empty/vỏ rỗng. F = full/có hàng. 20/40 = container size in feet.
  May appear as separate columns (size + full/empty) or combined (F20', E40').
  If a row has "1" under a column header like "F20'" or "E40'", that IS the cont_type.
- pickup: Origin location (Vietnamese name). Keep original text.
- dropoff: Destination location (Vietnamese name). Keep original text.
- vessel_name: Ship/vessel name if present in the document.
- consignee: Customer or cargo owner name.
- vehicle_plate: Vietnamese truck plate (e.g. 51C-12345, 15C04567).
- freight_charge: Price/freight as integer VND. null if unknown.
- source_row: The row index (R-number) from the input data where this record was found.
- consignee: Customer or cargo owner company name. Empty string if not found.
- vehicle_plate: Vietnamese truck plate (e.g. 51C-12345). Empty string if not found.
- freight_charge: Price/freight as integer VND. null if unknown.

RULES:
- Return ONLY rows that have a valid container number matching [A-Z]{4}[0-9]{7}.
- If a field is not available, use empty string "" for strings, null for numbers/dates.
- source_row MUST match the R-index prefix from the input data.
"""


async def extract_with_ai(sheets: list[SheetView], filename: str = "") -> list[ExtractedRow]:
    """Send sheet data to Gemini and parse the response.

    Returns an empty list on any failure — never raises.
    """
    try:
        from app.config import settings
        api_key = getattr(settings, "GEMINI_API_KEY", None)
    except Exception:
        return []

    if not api_key:
        return []

    _GEMINI_MODELS = ["gemini-flash-latest", "gemini-flash-lite-latest"]

    # Pick the most content-rich sheet
    sheet = _pick_richest_sheet(sheets)
    if sheet is None:
        return []

    # Convert to text representation (max 200 rows)
    text_data = _sheet_to_text(sheet, max_rows=200)
    if not text_data.strip():
        return []

    prompt = _EXTRACT_PROMPT + "\n\n--- DATA START ---\n" + text_data + "\n--- DATA END ---"

    import httpx

    _SCHEMA = {
        "type": "ARRAY",
        "items": {
            "type": "OBJECT",
            "properties": {
                "container_number": {"type": "STRING"},
                "cont_type": {"type": "STRING", "enum": ["E20", "E40", "F20", "F40"]},
                "pickup": {"type": "STRING"},
                "dropoff": {"type": "STRING"},
                "vessel_name": {"type": "STRING"},
                "consignee": {"type": "STRING"},
                "vehicle_plate": {"type": "STRING"},
                "freight_charge": {"type": "INTEGER", "nullable": True},
                "source_row": {"type": "INTEGER"},
            },
            "required": ["container_number", "cont_type", "source_row"],
        },
    }

    last_error = None
    for model_name in _GEMINI_MODELS:
        try:
            url = (
                f"https://generativelanguage.googleapis.com/v1beta/"
                f"models/{model_name}:generateContent?key={api_key}"
            )
            payload = {
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {
                    "temperature": 0,
                    "maxOutputTokens": 8192,
                    "responseMimeType": "application/json",
                    "responseSchema": _SCHEMA,
                },
            }
            async with httpx.AsyncClient(timeout=60.0) as client:
                resp = await client.post(url, json=payload)
                resp.raise_for_status()
                data = resp.json()

            text = (
                data.get("candidates", [{}])[0]
                .get("content", {})
                .get("parts", [{}])[0]
                .get("text", "")
                .strip()
            )
            if not text:
                last_error = "empty response"
                continue

            items = json.loads(text)
            if not isinstance(items, list):
                last_error = "non-array response"
                continue

            return _parse_extracted_items(items)

        except Exception as exc:
            last_error = str(exc)
            _logger.warning("[AI extract] %s failed: %s", model_name, last_error)

    _logger.warning("[AI extract] all models failed: %s", last_error)
    return []


def _parse_extracted_items(items: list[dict]) -> list[ExtractedRow]:
    """Convert Gemini JSON items into ExtractedRow objects."""
    rows: list[ExtractedRow] = []
    for item in items:
        cont_no = str(item.get("container_number", "")).strip().upper()
        if not cont_no:
            continue
        try:
            cont_no = parse_container_no(cont_no)
        except ValueError:
            continue

        cont_type = str(item.get("cont_type", "E20")).strip().upper()
        if not re.match(r"^[EF](20|40|45)$", cont_type):
            cont_type = "E20"

        pickup = str(item.get("pickup", "")).strip()
        dropoff = str(item.get("dropoff", "")).strip()
        vessel_name = str(item.get("vessel_name", "")).strip()
        consignee = str(item.get("consignee", "")).strip()
        vehicle_plate = str(item.get("vehicle_plate", "")).strip()
        freight_charge = item.get("freight_charge")
        if freight_charge is not None:
            try:
                freight_charge = float(freight_charge)
            except (ValueError, TypeError):
                freight_charge = None

        rows.append(ExtractedRow(
            container_number=cont_no,
            cont_type=cont_type,
            pickup=pickup,
            dropoff=dropoff,
            vessel_name=vessel_name,
            consignee=consignee,
            vehicle_plate=vehicle_plate,
            freight_charge=freight_charge,
            source_row_index=item.get("source_row", 0),
        ))
    return rows


def _pick_richest_sheet(sheets: list[SheetView]) -> SheetView | None:
    """Pick the sheet with the most non-empty cells."""
    best: SheetView | None = None
    best_count = 0
    for sheet in sheets:
        if sheet.state == "veryHidden":
            continue
        count = sum(1 for row in sheet.rows[:200] for cell in row if cell is not None and str(cell).strip())
        if count > best_count:
            best_count = count
            best = sheet
    return best


def _sheet_to_text(sheet: SheetView, max_rows: int = 200) -> str:
    """Convert sheet to tab-delimited text with row indices for the AI prompt."""
    lines: list[str] = []
    for r, row in enumerate(sheet.rows[:max_rows]):
        cells = []
        for cell in row:
            if cell is None:
                cells.append("[EMPTY]")
            else:
                s = str(cell).strip()
                # Truncate very long cells but keep them long enough for names
                if len(s) > 120:
                    s = s[:117] + "..."
                cells.append(s)
        line = "\t".join(cells)
        # Keep all rows to preserve indices
        lines.append(f"R{r}\t{line}")
    return "\n".join(lines)
