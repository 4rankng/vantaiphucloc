"""AI file parsing pipeline orchestrator.

Coordinates the 5 stages: Sniff → Cache → Apply → Cleanup → Preview
Also provides template-based parsing for customer Excel files.
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass
from datetime import datetime
from typing import Any, BinaryIO

from openpyxl import load_workbook

from app.ai.parser import (
    ColumnMapping,
    ParseResult,
    ParsedCell,
    ParsedRow,
    _compute_file_hash,
    sniff_columns,
    CANONICAL_FIELDS,
)
from app.ai.mapping_cache import get_cached_mapping, save_mapping
from app.ai.gemini_client import call_gemini_row_cleanup, estimate_cost

_logger = logging.getLogger(__name__)

SAMPLE_ROWS = 20  # Rows to send to LLM for sniffing
PREVIEW_ROWS = 20  # Rows to show in preview

# ---------------------------------------------------------------------------
# Template-based Excel parsing (no AI)
# ---------------------------------------------------------------------------

# Mapping from raw header text to display name.
# None = skip column. Keys are stripped + uppercased for matching.
_TEMPLATE_HEADER_MAP: dict[str, str | None] = {
    "STT": None,
    "NGÀY ĐI": "Ngày đi",
    "CHỦ HÀNG": "Chủ hàng",
    "SỐCONTAINER": "Số Cont",
    "SỐ CONTAINER": "Số Cont",
    "SỐ CONT": "Số Cont",
    "F20'": "F20",
    "F40'": "F40",
    "E20'": "E20",
    "E40'": "E40",
    "SỐ XE CHẠY": "Số xe chạy",
    "ĐIỂM ĐI": "Điểm đi",
    "ĐIỂM ĐẾN": "Điểm đến",
    "SỐ CHUYẾN": "Số chuyến",
    "CƯỚC CHUYẾN": "Cước chuyến",
    "CƯỚC\nCHUYẾN": "Cước chuyến",
    "TỔNG TT": "Tổng TT",
    "TÁC NGHIỆP": "Tác Nghiệp",
    "GHI CHÚ": None,
    "GHI\nCHÚ": None,
}


def _clean_value(val: str) -> str:
    """Strip leading/trailing whitespace, dots, commas, semicolons."""
    return re.sub(r'^[\s,.;:]+|[\s,.;:]+$', '', val)


def _normalise_header(raw: str) -> str:
    return re.sub(r"\s+", " ", raw.strip()).upper()


@dataclass
class TemplateParseResult:
    filename: str
    sheet_name: str
    total_rows: int
    columns: list[str]
    rows: list[dict[str, Any]]


def parse_template_excel(file: BinaryIO, filename: str) -> TemplateParseResult:
    """Parse a customer-template Excel file (SL sheet, fixed column layout)."""
    wb = load_workbook(file, read_only=True, data_only=True)

    # Find the SL sheet
    ws = None
    for name in wb.sheetnames:
        if name.strip().upper().startswith("SL"):
            ws = wb[name]
            break
    if ws is None:
        raise ValueError(
            "Không tìm thấy sheet 'SL' trong file. "
            "Vui lòng dùng file theo mẫu (sheet bắt đầu bằng 'SL')."
        )

    # Read all rows into lists
    all_rows: list[list[Any]] = []
    for row in ws.iter_rows(values_only=True):
        all_rows.append(list(row))

    # Header row is row index 9 (1-indexed row 10)
    HEADER_IDX = 9
    DATA_START = 11  # 1-indexed row 12

    if len(all_rows) <= HEADER_IDX:
        raise ValueError("File quá ngắn — không tìm thấy dòng tiêu đề.")

    raw_headers = [_normalise_header(str(c)) if c is not None else "" for c in all_rows[HEADER_IDX]]

    # Map column indices to display names
    col_map: dict[int, str] = {}
    for idx, raw_h in enumerate(raw_headers):
        display = _TEMPLATE_HEADER_MAP.get(raw_h)
        if display is None:
            continue  # skip STT
        col_map[idx] = display

    columns = list(col_map.values())

    # Parse data rows
    rows: list[dict[str, Any]] = []
    for row in all_rows[DATA_START:]:
        # Stop at summary/end
        first_val = row[0] if row else None
        if first_val is None or str(first_val).strip() == "" or str(first_val).strip().upper().startswith("CỘNG"):
            break

        record: dict[str, Any] = {}
        all_empty = True
        for col_idx, display_name in col_map.items():
            val = row[col_idx] if col_idx < len(row) else None
            if isinstance(val, datetime):
                val = val.strftime("%d/%m/%Y")
            elif val is not None:
                val = _clean_value(str(val)) or None
            if val is not None:
                all_empty = False
            record[display_name] = val

        if all_empty:
            continue
        rows.append(record)

    return TemplateParseResult(
        filename=filename,
        sheet_name=ws.title,
        total_rows=len(rows),
        columns=columns,
        rows=rows,
    )


async def parse_file(
    file: BinaryIO,
    filename: str,
    source_id: str | None = None,
    max_rows: int = 1000,
) -> ParseResult:
    """Parse an arbitrary-format Excel file through the 5-stage pipeline.

    Args:
        file: File-like object (Excel .xlsx)
        filename: Original filename for reference
        source_id: Customer/vendor ID for caching
        max_rows: Maximum rows to process

    Returns:
        ParseResult with parsed rows and metadata
    """
    # Load workbook
    wb = load_workbook(file, read_only=True, data_only=True)
    ws = wb.active

    # Extract all rows as lists
    all_rows: list[list[Any]] = []
    for row in ws.iter_rows(max_row=max_rows + 1, values_only=True):
        all_rows.append([str(c) if c is not None else "" for c in row])

    if not all_rows:
        raise ValueError("File is empty")

    # Stage 1 + 2: Sniff with cache
    sample_rows = all_rows[:SAMPLE_ROWS]
    file_hash = _compute_file_hash(all_rows)

    cached = get_cached_mapping(source_id, file_hash)
    sniff_cost = 0.0

    if cached:
        mapping = ColumnMapping(
            header_row=cached.get("header_row", 0),
            mapping={int(k): v for k, v in cached.get("mapping", {}).items()},
            confidence=cached.get("confidence", 0.5),
        )
        _logger.info(f"Using cached mapping for {filename}")
    else:
        mapping = await sniff_columns(sample_rows, source_id)
        sniff_cost = estimate_cost(
            input_tokens=len(str(sample_rows)) // 4,  # Rough estimate
            output_tokens=200,
        )
        # Stage 2: Cache the mapping
        if mapping.confidence > 0.3 and mapping.mapping:
            save_mapping(source_id, file_hash, {
                "header_row": mapping.header_row,
                "mapping": mapping.mapping,
                "confidence": mapping.confidence,
            })

    if not mapping.mapping:
        raise ValueError(
            f"Could not detect column mapping from file. "
            f"Confidence: {mapping.confidence}. "
            f"Try a file with clearer headers."
        )

    # Stage 3: Apply mapping (programmatic, fast)
    data_start = mapping.header_row + 1
    data_rows = all_rows[data_start:data_start + max_rows]

    parsed_rows: list[ParsedRow] = []
    rows_needing_cleanup: list[tuple[int, ParsedRow, list[str]]] = []

    for i, raw_row in enumerate(data_rows):
        row_num = data_start + i + 1  # 1-indexed
        cells: dict[str, ParsedCell] = {}
        issues: list[str] = []

        for col_idx, field_name in mapping.mapping.items():
            if col_idx >= len(raw_row):
                continue

            raw_value = raw_row[col_idx]
            cleaned_value, confidence, was_cleaned = _apply_programmatic(field_name, raw_value)

            cells[field_name] = ParsedCell(
                value=cleaned_value,
                confidence=confidence,
                original_value=raw_value if was_cleaned else None,
                cleaned=was_cleaned,
            )

            if confidence < 0.5:
                issues.append(f"{field_name}: uncertain value '{raw_value}'")

        # Add source reference
        cells["source_row_ref"] = ParsedCell(
            value=f"{filename}:R{row_num}",
            confidence=1.0,
        )

        parsed_row = ParsedRow(
            row_number=row_num,
            cells=cells,
            source_row_ref=f"{filename}:R{row_num}",
        )

        parsed_rows.append(parsed_row)

        # Stage 4 gate: only send to LLM if multiple issues
        if len(issues) >= 2:
            row_data = {k: str(v.value) for k, v in cells.items() if k != "source_row_ref"}
            rows_needing_cleanup.append((i, parsed_row, issues))

    # Stage 4: Cleanup problematic rows via LLM (limited)
    MAX_CLEANUP_ROWS = 10  # Cost control
    for idx, parsed_row, issues in rows_needing_cleanup[:MAX_CLEANUP_ROWS]:
        try:
            row_data = {k: str(v.value) for k, v in parsed_row.cells.items() if k != "source_row_ref"}
            cleaned = await call_gemini_row_cleanup(row_data, issues)

            for field_name, cleaned_value in cleaned.items():
                if field_name in parsed_row.cells:
                    parsed_row.cells[field_name].value = cleaned_value
                    parsed_row.cells[field_name].cleaned = True
                    parsed_row.cells[field_name].confidence = 0.7
        except Exception as e:
            _logger.warning(f"Row cleanup failed for row {parsed_row.row_number}: {e}")

    # Calculate total cost
    total_cost = sniff_cost
    if rows_needing_cleanup:
        cleanup_cost = estimate_cost(
            input_tokens=len(rows_needing_cleanup) * 100,
            output_tokens=len(rows_needing_cleanup) * 50,
        )
        total_cost += cleanup_cost

    _logger.info(f"Parsed {len(parsed_rows)} rows, cost estimate: ${total_cost:.4f}")

    return ParseResult(
        column_mapping=mapping,
        rows=parsed_rows,
        total_rows=len(parsed_rows),
        cached_mapping=bool(cached),
        sniff_cost_estimate=total_cost,
    )


def _apply_programmatic(field_name: str, raw_value: str) -> tuple[Any, float, bool]:
    """Stage 3: Apply programmatic cleaning to a cell value.

    Returns:
        (cleaned_value, confidence, was_cleaned)
    """
    if not raw_value or not raw_value.strip():
        return None, 1.0, False

    value = raw_value.strip()

    if field_name == "date":
        # Try common date formats
        for fmt in ["%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%d/%m/%y", "%d-%m-%y"]:
            try:
                dt = datetime.strptime(value, fmt)
                return dt.strftime("%Y-%m-%d"), 1.0, fmt != "%Y-%m-%d"
            except ValueError:
                continue
        return value, 0.3, False

    elif field_name == "container_number":
        cleaned = value.upper().replace(" ", "").replace("-", "")
        if re.match(r"^[A-Z]{4}\d{7}$", cleaned):
            return cleaned, 1.0, cleaned != value.upper()
        return value, 0.3, False

    elif field_name == "amount":
        # Remove currency suffixes and formatting
        cleaned = re.sub(r"[^\d]", "", value)
        if cleaned and cleaned.isdigit():
            return int(cleaned), 1.0, cleaned != value
        return value, 0.3, False

    elif field_name in ("route_from", "route_to"):
        return value, 0.9, False

    elif field_name in ("customer_name", "vendor_name", "driver_name"):
        return value, 0.9, False

    elif field_name == "vehicle_plate":
        cleaned = value.upper().replace(" ", "").replace("-", "")
        return cleaned, 0.9, cleaned != value

    else:
        return value, 0.9, False
