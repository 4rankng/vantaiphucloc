"""AI-powered file parser for arbitrary-format reconciliation files.

5-stage pipeline:
1. Sniff — detect column mapping via LLM
2. Cache — persist mapping per source
3. Apply — programmatic mapping (fast, no LLM)
4. Cleanup — LLM for problematic rows only
5. Preview — return results with confidence scores
"""

from __future__ import annotations

import hashlib
import json
import logging
import re
from dataclasses import dataclass, field
from typing import Any

from app.ai.gemini_client import call_gemini

_logger = logging.getLogger(__name__)

# Canonical schema fields
CANONICAL_FIELDS = [
    "date",
    "route_from",
    "route_to",
    "container_number",
    "container_type",
    "amount",
    "customer_name",
    "vendor_name",
    "driver_name",
    "vehicle_plate",
    "notes",
    "source_row_ref",
]

# Field descriptions for LLM prompt
FIELD_DESCRIPTIONS = {
    "date": "Trip/order date (ngày đi/ngày chuyến)",
    "route_from": "Pickup location / origin (điểm lấy/đi từ)",
    "route_to": "Dropoff location / destination (điểm trả/đi đến)",
    "container_number": "Container number (số container, format ABCU1234567)",
    "container_type": "Container type/size (loại container: 20ft, 40ft, 40HC...)",
    "amount": "Amount/price in VND (số tiền/cước phí)",
    "customer_name": "Customer company name (tên khách hàng)",
    "vendor_name": "Vendor/contractor name (tên nhà xe/nhà thầu)",
    "driver_name": "Driver name (tên tài xế)",
    "vehicle_plate": "Vehicle plate number (biển số xe)",
    "notes": "Notes/remarks (ghi chú)",
    "source_row_ref": "Original row reference for traceability",
}


@dataclass
class ColumnMapping:
    """LLM-detected column mapping."""
    header_row: int  # 0-indexed row where headers are
    mapping: dict[int, str]  # {column_index: canonical_field_name}
    confidence: float  # 0-1 overall confidence
    raw_response: str | None = None


@dataclass
class ParsedCell:
    """Single parsed cell with confidence."""
    value: Any
    confidence: float  # 0-1
    original_value: Any = None
    cleaned: bool = False  # True if value was cleaned/corrected


@dataclass
class ParsedRow:
    """Single row parsed from input file."""
    row_number: int
    cells: dict[str, ParsedCell]  # {canonical_field: ParsedCell}
    source_row_ref: str
    parse_error: str | None = None


@dataclass
class ParseResult:
    """Complete parse result."""
    column_mapping: ColumnMapping
    rows: list[ParsedRow]
    total_rows: int
    cached_mapping: bool  # True if mapping was from cache
    sniff_cost_estimate: float  # USD estimate for LLM call


def _compute_file_hash(rows: list[list[Any]]) -> str:
    """Hash the file structure (headers + first few rows) for caching."""
    content = json.dumps(rows[:5], default=str, ensure_ascii=False)
    return hashlib.sha256(content.encode()).hexdigest()[:16]


def _build_sniff_prompt(sample_rows: list[list[str]], max_cols: int = 20) -> str:
    """Build the LLM prompt for column detection."""
    # Format sample rows as a table
    table_lines = []
    for i, row in enumerate(sample_rows):
        cells = [str(c).strip() if c is not None else "" for c in row[:max_cols]]
        table_lines.append(f"Row {i}: | {' | '.join(cells)} |")
    table = "\n".join(table_lines)

    field_list = "\n".join(f"  - {k}: {v}" for k, v in FIELD_DESCRIPTIONS.items())

    return f"""You are a data mapping assistant for a Vietnamese trucking/logistics company.
Given the following sample rows from a spreadsheet, identify which column corresponds to which canonical field.

Canonical fields:
{field_list}

Sample data (first ~20 rows):
{table}

OUTPUT FORMAT — respond with ONLY raw JSON, no markdown fences, no explanation:
{{"header_row": 0, "mapping": {{0: "date", 1: "route_from"}}, "confidence": 0.9}}

Rules:
- Only map columns you are confident about. Skip uncertain columns.
- Column indices are 0-based.
- If a field doesn't exist in the data, don't include it.
- Vietnamese headers are common: ngày→date, từ/điểm đi→route_from, đến/điểm đến→route_to, container→container_number, loại→container_type, tiền/cước/amount→amount, khách→customer_name, nhà xe/nhà thầu→vendor_name, tài xế/lái xe→driver_name, biển số→vehicle_plate, ghi chú→notes
- Amount columns might have currency suffixes (VND, đ, etc.)
- Date formats vary: DD/MM/YYYY, YYYY-MM-DD, DD-MM-YY, etc.
"""


def _extract_json(text: str) -> dict:
    """Extract first JSON object from LLM response, tolerating fences and surrounding text."""
    # Try to find a JSON object using brace matching
    # First attempt: strip code fences
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("\n", 1)[1] if "\n" in cleaned else cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        cleaned = cleaned.strip()

    # Find the first { ... } block
    start = cleaned.find("{")
    if start == -1:
        raise ValueError("No JSON object found in response")
    depth = 0
    for i in range(start, len(cleaned)):
        if cleaned[i] == "{":
            depth += 1
        elif cleaned[i] == "}":
            depth -= 1
            if depth == 0:
                return json.loads(cleaned[start : i + 1])
    # Fallback: parse from first { to end
    return json.loads(cleaned[start:])


async def sniff_columns(sample_rows: list[list[str]], source_id: str | None = None) -> ColumnMapping:
    """Stage 1: Detect column mapping using Gemini.

    Args:
        sample_rows: First ~20 rows from the file (as strings)
        source_id: Optional source identifier for caching

    Returns:
        ColumnMapping with detected mapping
    """
    prompt = _build_sniff_prompt(sample_rows)

    response = await call_gemini(prompt)

    # Parse JSON from response — robust extraction
    try:
        data = _extract_json(response)
        return ColumnMapping(
            header_row=data.get("header_row", 0),
            mapping={int(k): v for k, v in data.get("mapping", {}).items()},
            confidence=data.get("confidence", 0.5),
            raw_response=response,
        )
    except (json.JSONDecodeError, ValueError) as e:
        _logger.error(f"Failed to parse LLM response: {e}\nResponse: {response[:200]}")
        return ColumnMapping(
            header_row=0,
            mapping={},
            confidence=0.0,
            raw_response=response,
        )
