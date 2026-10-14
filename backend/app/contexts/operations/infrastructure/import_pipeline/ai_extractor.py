"""AI-powered fallback extraction for unparseable shipping Excel files.

When no known pattern matches and the generic pipeline fails, this module
sends the raw sheet data to an OpenRouter model (OpenAI-compatible
chat/completions; default ``settings.OPENROUTER_MODEL``) for extraction.
Uses the same OpenRouter client infrastructure as ``openrouter.py``.
"""

from __future__ import annotations

import json
import logging
import re

from app.contexts.operations.infrastructure.import_pipeline.pattern_extractors import (
    ExtractedRow,
)
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
- container_number: either ISO 6346 format (4 uppercase letters + 7 digits,
  e.g. TCNU2473728) or a short painted code (4 uppercase letters + 4 digits,
  e.g. HCVT0002). Skip rows without either accepted shape.
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
- Return ONLY rows with 4 uppercase letters followed by either 7 or 4 digits.
- If a field is not available, use empty string "" for strings, null for numbers/dates.
- source_row MUST match the R-index prefix from the input data.

OUTPUT:
- Return ONLY a JSON object of the form {"rows": [ ... ]} — no prose, no
  markdown fences. Each array item has the keys: container_number, cont_type,
  pickup, dropoff, vessel_name, consignee, vehicle_plate, freight_charge,
  source_row.
"""

_JSON_ARRAY_RE = re.compile(r"\[.*\]", re.DOTALL)


async def extract_with_ai(
    sheets: list[SheetView], filename: str = ""
) -> list[ExtractedRow]:
    """Send sheet data to an OpenRouter model and parse the response.

    Returns an empty list on any failure — never raises.
    """
    try:
        from app.config import settings

        if not settings.OPENROUTER_API_KEY:
            return []

        # Pick the most content-rich sheet
        sheet = _pick_richest_sheet(sheets)
        if sheet is None:
            return []

        # Convert to text representation (max 200 rows)
        text_data = _sheet_to_text(sheet, max_rows=200)
        if not text_data.strip():
            return []

        prompt = (
            _EXTRACT_PROMPT
            + "\n\n--- DATA START ---\n"
            + text_data
            + "\n--- DATA END ---"
        )

        from app.contexts.operations.infrastructure.openrouter import (
            call_openrouter_completion,
        )

        result = await call_openrouter_completion(
            prompt,
            max_tokens=8192,
            response_format={"type": "json_object"},
        )
        if not result.get("success"):
            _logger.warning("[AI extract] OpenRouter failed: %s", result.get("error"))
            return []

        items = _parse_json_rows(result.get("text") or "")
        if items is None:
            _logger.warning("[AI extract] could not parse JSON rows from response")
            return []

        return _parse_extracted_items(items)
    except Exception as exc:
        _logger.warning("[AI extract] failed: %s", exc)
        return []


def _parse_json_rows(text: str) -> list[dict] | None:
    """Best-effort parse of a model response into a list of row dicts.

    Accepts the prompted ``{"rows": [...]}`` object, a bare JSON array, or an
    array embedded in prose/markdown fences. Returns None when nothing
    array-shaped can be recovered.
    """
    data = None
    try:
        data = json.loads(text)
    except (ValueError, TypeError):
        match = _JSON_ARRAY_RE.search(text)
        if match is not None:
            try:
                data = json.loads(match.group(0))
            except (ValueError, TypeError):
                return None
    if isinstance(data, dict):
        data = data.get("rows")
    if not isinstance(data, list):
        return None
    return [item for item in data if isinstance(item, dict)]


def _parse_extracted_items(items: list[dict]) -> list[ExtractedRow]:
    """Convert model JSON items into ExtractedRow objects."""
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

        rows.append(
            ExtractedRow(
                container_number=cont_no,
                cont_type=cont_type,
                pickup=pickup,
                dropoff=dropoff,
                vessel_name=vessel_name,
                consignee=consignee,
                vehicle_plate=vehicle_plate,
                freight_charge=freight_charge,
                source_row_index=item.get("source_row", 0),
            )
        )
    return rows


def _pick_richest_sheet(sheets: list[SheetView]) -> SheetView | None:
    """Pick the sheet with the most non-empty cells."""
    best: SheetView | None = None
    best_count = 0
    for sheet in sheets:
        if sheet.state == "veryHidden":
            continue
        count = sum(
            1
            for row in sheet.rows[:200]
            for cell in row
            if cell is not None and str(cell).strip()
        )
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
