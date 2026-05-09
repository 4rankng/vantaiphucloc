"""AI-powered fallback extraction for unparseable shipping Excel files.

When no known pattern matches and the generic pipeline fails, this module
sends the raw sheet data to Gemini for extraction.  Uses the same Gemini
API infrastructure as ``llm.py``.
"""

from __future__ import annotations

import json
import logging
import re
from typing import Any

from app.contexts.operations.infrastructure.import_pipeline.pattern_extractors import ExtractedRow
from app.contexts.operations.infrastructure.import_pipeline.value_parsers import (
    build_cont_type,
    parse_container_no,
)
from app.contexts.operations.infrastructure.import_pipeline.workbook import SheetView

_logger = logging.getLogger(__name__)

_EXTRACT_PROMPT = """\
Extract container data from this shipping document.
For each container found, return a JSON object with these fields:
- container_number: ISO container number (4 uppercase letters + 7 digits, e.g. TCNU2473728)
- cont_type: one of E20, E40, F20, F40 (E=empty/vỏ, F=full/hàng, 20/40=feet)
- pickup: origin/pickup location name (empty string if unknown)
- dropoff: destination/dropoff location name (empty string if unknown)

Return ONLY a JSON array. No explanation, no markdown fences.
Example: [{"container_number":"TCNU2473728","cont_type":"E20","pickup":"HAIPHONG","dropoff":"HKG"}]
If a field is unknown, use empty string.
"""


async def extract_with_ai(sheets: list[SheetView], filename: str = "") -> list[ExtractedRow]:
    """Send sheet data to Gemini and parse the response.

    Returns an empty list on any failure — never raises.
    """
    try:
        from app.config import settings
        api_key = getattr(settings, "GEMINI_API_KEY", None)
        model = getattr(settings, "GEMINI_MODEL", "gemini-2.5-flash")
    except Exception:
        return []

    if not api_key:
        return []

    # Pick the most content-rich sheet
    sheet = _pick_richest_sheet(sheets)
    if sheet is None:
        return []

    # Convert to text representation (max 200 rows)
    text_data = _sheet_to_text(sheet, max_rows=200)
    if not text_data.strip():
        return []

    prompt = _EXTRACT_PROMPT + "\n\n--- DATA START ---\n" + text_data + "\n--- DATA END ---"

    try:
        import httpx
        url = (
            f"https://generativelanguage.googleapis.com/v1beta/"
            f"models/{model}:generateContent?key={api_key}"
        )
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": 0, "maxOutputTokens": 8192},
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
            return []

        # Strip markdown code fences if present
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)

        items = json.loads(text)
        if not isinstance(items, list):
            return []

        rows: list[ExtractedRow] = []
        for item in items:
            cont_no = str(item.get("container_number", "")).strip().upper()
            if not cont_no:
                continue
            try:
                cont_no = parse_container_no(cont_no)
            except ValueError:
                continue

            work_type = str(item.get("cont_type", "E20")).strip().upper()
            # Validate work_type
            if not re.match(r"^[EF](20|40|45)$", work_type):
                work_type = "E20"

            pickup = str(item.get("pickup", "")).strip()
            dropoff = str(item.get("dropoff", "")).strip()

            rows.append(ExtractedRow(
                container_number=cont_no,
                work_type=work_type,
                pickup=pickup,
                dropoff=dropoff,
                vessel_name="",
                source_row_index=0,
            ))
        return rows

    except Exception as exc:
        _logger.warning("AI extraction failed: %s", exc)
        return []


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
    """Convert sheet to pipe-delimited text for the AI prompt."""
    lines: list[str] = []
    for r, row in enumerate(sheet.rows[:max_rows]):
        cells = []
        for cell in row:
            if cell is None:
                cells.append("")
            else:
                s = str(cell).strip()
                # Truncate very long cells
                if len(s) > 60:
                    s = s[:57] + "..."
                cells.append(s)
        line = " | ".join(cells)
        # Skip completely empty lines
        if line.replace("|", "").strip():
            lines.append(line)
    return "\n".join(lines)
