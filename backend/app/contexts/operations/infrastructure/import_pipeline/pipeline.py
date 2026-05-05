"""Layer 5 — orchestration + per-row validation & bucketing.

Public entry-points:

- `run_preview(content, filename, default_trip_date, classifier=None)`
   → `PreviewResult` with detected layout, column mapping, accepted rows,
     rejected rows.

- `apply_mapping(sheet, header_row, mapping, default_trip_date)`
   → `(accepted, rejected)` rows when the user has overridden the mapping
     in the UI. Used by `imports.preview` (re-render with edits) and by
     `imports.commit`.
"""

from __future__ import annotations

import hashlib
import json
from dataclasses import asdict, dataclass, field
from datetime import date
from typing import Any

from app.contexts.operations.infrastructure.import_pipeline.canonical import (
    CANONICAL_FIELDS,
    SKIP_FIELD,
    normalize_header_text,
)
from app.contexts.operations.infrastructure.import_pipeline.column_mapper import ColumnMapping, map_columns
from app.contexts.operations.infrastructure.import_pipeline.header_finder import (
    HeaderHit,
    find_header_row,
    header_row_text,
)
from app.contexts.operations.infrastructure.import_pipeline.llm import HeaderClassifier
from app.contexts.operations.infrastructure.import_pipeline.sheet_picker import SheetScore, score_sheets
from app.contexts.operations.infrastructure.import_pipeline.value_parsers import (
    parse_container_no,
    parse_container_size,
    parse_date,
    parse_freight_kind,
    parse_plate,
    parse_string,
    parse_weight_kg,
)
from app.contexts.operations.infrastructure.import_pipeline.workbook import SheetView, load_workbook


# ---------------------------------------------------------------------------
# Result types
# ---------------------------------------------------------------------------

@dataclass
class ParsedRow:
    """One row that passed validation. `values` is keyed by canonical field name."""
    source_row_index: int
    values: dict[str, Any]


@dataclass
class RejectedRow:
    source_row_index: int
    reasons: list[str]
    raw: dict[str, Any]


@dataclass
class PreviewResult:
    filename: str
    sheet_name: str
    sheet_alternatives: list[dict[str, Any]]   # other sheets the user could pick
    header_row_index: int                       # 0-based
    structure_hash: str                         # sha256 of (sheet_name, normalized header texts)
    column_mappings: list[dict[str, Any]]
    accepted: list[dict[str, Any]]
    rejected: list[dict[str, Any]]
    stats: dict[str, Any]
    warnings: list[str]

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


# ---------------------------------------------------------------------------
# Public entry-points
# ---------------------------------------------------------------------------

async def run_preview(
    content: bytes,
    filename: str,
    default_trip_date: date,
    classifier: HeaderClassifier | None = None,
    cached_mapping: list[ColumnMapping] | None = None,
) -> PreviewResult:
    sheets = load_workbook(content, filename)
    if not sheets:
        raise ValueError("Tệp Excel không có sheet nào.")

    scored = score_sheets(sheets)
    if not scored or scored[0].score <= 0:
        raise ValueError("Không tìm thấy sheet nào trông giống danh sách container.")

    chosen = scored[0]
    alternatives = [
        {
            "sheet_name": s.sheet.name,
            "score": round(s.score, 2),
            "container_hits": s.container_hits,
            "header_synonym_hits": s.header_synonym_hits,
        }
        for s in scored[1:5]
        if s.score > 0
    ]

    hit = find_header_row(chosen.sheet)
    if hit is None:
        raise ValueError(
            f"Không nhận diện được dòng tiêu đề trong sheet '{chosen.sheet.name}'."
        )

    structure_hash = compute_structure_hash(chosen.sheet.name, header_row_text(chosen.sheet, hit.row_index))

    if cached_mapping is not None:
        mappings = cached_mapping
    else:
        mappings = await map_columns(chosen.sheet, hit.row_index, classifier=classifier)

    accepted, rejected = apply_mapping(
        chosen.sheet, hit.row_index, mappings, default_trip_date,
    )

    warnings: list[str] = []
    needs_review = [m for m in mappings if (m.canonical_field is None) or (m.confidence < 0.5 and m.canonical_field != SKIP_FIELD)]
    if needs_review:
        warnings.append(f"{len(needs_review)} cột chưa được mapping tự động — vui lòng kiểm tra.")

    required_fields = {f.name for f in CANONICAL_FIELDS if f.required}
    mapped_fields = {m.canonical_field for m in mappings if m.canonical_field and m.canonical_field != SKIP_FIELD}
    missing = required_fields - mapped_fields
    if missing:
        warnings.append("Thiếu cột bắt buộc: " + ", ".join(sorted(missing)))

    stats = {
        "total_rows_in_sheet": chosen.sheet.n_rows,
        "data_rows_scanned": max(0, chosen.sheet.n_rows - hit.row_index - 1),
        "accepted_count": len(accepted),
        "rejected_count": len(rejected),
        "header_score": round(hit.score, 2),
        "header_synonym_hits": hit.synonym_hits,
        "sheet_score": round(chosen.score, 2),
    }

    return PreviewResult(
        filename=filename,
        sheet_name=chosen.sheet.name,
        sheet_alternatives=alternatives,
        header_row_index=hit.row_index,
        structure_hash=structure_hash,
        column_mappings=[m.to_dict() for m in mappings],
        accepted=[_parsed_to_dict(p) for p in accepted],
        rejected=[_rejected_to_dict(r) for r in rejected],
        stats=stats,
        warnings=warnings,
    )


def apply_mapping(
    sheet: SheetView,
    header_row: int,
    mappings: list[ColumnMapping],
    default_trip_date: date,
) -> tuple[list[ParsedRow], list[RejectedRow]]:
    """Slice the sheet into accepted/rejected rows based on the mapping.

    De-duplicates by container_number within the file (keeps the first
    occurrence; later duplicates rejected with reason `duplicate_in_file`).
    """
    accepted: list[ParsedRow] = []
    rejected: list[RejectedRow] = []
    seen_containers: set[str] = set()

    # Index mappings by canonical field for fast lookup
    by_field: dict[str, ColumnMapping] = {}
    for m in mappings:
        if m.canonical_field and m.canonical_field != SKIP_FIELD:
            # If two columns map to the same field, the one with higher
            # confidence wins; ties keep the first.
            existing = by_field.get(m.canonical_field)
            if existing is None or m.confidence > existing.confidence:
                by_field[m.canonical_field] = m

    # Detect "all-empty" tail rows so we don't treat trailing whitespace
    # as 600 rejected entries. Stop once we hit 50 consecutive empty rows.
    empty_streak = 0
    EMPTY_TAIL_LIMIT = 50

    for r in range(header_row + 1, len(sheet.rows)):
        raw_row = sheet.rows[r]
        if not _row_has_any_content(raw_row):
            empty_streak += 1
            if empty_streak >= EMPTY_TAIL_LIMIT:
                break
            continue
        empty_streak = 0

        raw_dict, parsed_or_reasons = _parse_row(raw_row, by_field, default_trip_date)
        if isinstance(parsed_or_reasons, list):
            rejected.append(RejectedRow(source_row_index=r, reasons=parsed_or_reasons, raw=raw_dict))
            continue

        cont_key = parsed_or_reasons.get("container_no", "")
        if cont_key and cont_key in seen_containers:
            rejected.append(RejectedRow(
                source_row_index=r,
                reasons=["duplicate_in_file"],
                raw=raw_dict,
            ))
            continue
        if cont_key:
            seen_containers.add(cont_key)

        accepted.append(ParsedRow(source_row_index=r, values=parsed_or_reasons))

    return accepted, rejected


# ---------------------------------------------------------------------------
# Row parsing
# ---------------------------------------------------------------------------

def _parse_row(
    row: list[Any],
    by_field: dict[str, ColumnMapping],
    default_trip_date: date,
) -> tuple[dict[str, Any], dict[str, Any] | list[str]]:
    raw_dict: dict[str, Any] = {}
    for field_name, m in by_field.items():
        cell = row[m.column_index] if m.column_index < len(row) else None
        raw_dict[field_name] = cell

    reasons: list[str] = []

    # Required fields
    try:
        cont_no = parse_container_no(raw_dict.get("container_no"))
    except ValueError as exc:
        reasons.append(str(exc))
        cont_no = None

    try:
        size = parse_container_size(
            raw_dict.get("container_size"),
            iso_hint=raw_dict.get("container_type_iso"),
        )
    except ValueError as exc:
        reasons.append(str(exc))
        size = None

    try:
        kind = parse_freight_kind(raw_dict.get("freight_kind"))
    except ValueError as exc:
        reasons.append(str(exc))
        kind = None

    if reasons:
        return raw_dict, reasons

    # Optional fields
    weight = parse_weight_kg(raw_dict.get("gross_weight_kg"))
    seal = parse_string(raw_dict.get("seal_no"), max_len=80) if "seal_no" in raw_dict else ""
    pickup_loc = parse_string(raw_dict.get("pickup_location"), max_len=255) if "pickup_location" in raw_dict else ""
    dropoff_loc = parse_string(raw_dict.get("dropoff_location"), max_len=255) if "dropoff_location" in raw_dict else ""

    pickup_date = parse_date(raw_dict.get("pickup_date")) if "pickup_date" in raw_dict else None
    dropoff_date = parse_date(raw_dict.get("dropoff_date")) if "dropoff_date" in raw_dict else None
    trip_date = parse_date(raw_dict.get("trip_date")) if "trip_date" in raw_dict else None
    if trip_date is None:
        trip_date = pickup_date or dropoff_date or default_trip_date

    customer_ref = parse_string(raw_dict.get("customer_ref"), max_len=100) if "customer_ref" in raw_dict else ""
    consignee = parse_string(raw_dict.get("consignee"), max_len=255) if "consignee" in raw_dict else ""
    commodity = parse_string(raw_dict.get("commodity"), max_len=500) if "commodity" in raw_dict else ""
    driver_name = parse_string(raw_dict.get("driver_name"), max_len=255) if "driver_name" in raw_dict else ""
    plate = parse_plate(raw_dict.get("tractor_plate")) if "tractor_plate" in raw_dict else ""
    remarks = parse_string(raw_dict.get("remarks"), max_len=500) if "remarks" in raw_dict else ""

    work_type = f"{kind}{size}"  # F20 / F40 / E20 / E40

    parsed = {
        "container_no": cont_no,
        "container_size": size,
        "freight_kind": kind,
        "work_type": work_type,
        "container_type_iso": parse_string(raw_dict.get("container_type_iso"), max_len=20),
        "gross_weight_kg": weight,
        "seal_no": seal,
        "pickup_location": pickup_loc,
        "dropoff_location": dropoff_loc,
        "pickup_date": pickup_date.isoformat() if pickup_date else None,
        "dropoff_date": dropoff_date.isoformat() if dropoff_date else None,
        "trip_date": trip_date.isoformat() if trip_date else None,
        "customer_ref": customer_ref,
        "consignee": consignee,
        "commodity": commodity,
        "driver_name": driver_name,
        "tractor_plate": plate,
        "remarks": remarks,
    }
    return raw_dict, parsed


def _row_has_any_content(row: list[Any]) -> bool:
    for c in row:
        if c is None:
            continue
        if isinstance(c, str) and not c.strip():
            continue
        return True
    return False


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def compute_structure_hash(sheet_name: str, header_row_cells: list[str]) -> str:
    """Hash the layout signature so we can cache mappings per customer.

    Uses normalized header text so trivial edits (case, accents) don't bust
    the cache.
    """
    payload = json.dumps(
        {
            "sheet": sheet_name,
            "headers": [normalize_header_text(c) for c in header_row_cells],
        },
        ensure_ascii=False,
        separators=(",", ":"),
    )
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def _parsed_to_dict(p: ParsedRow) -> dict[str, Any]:
    return {"source_row_index": p.source_row_index, "values": p.values}


def _rejected_to_dict(r: RejectedRow) -> dict[str, Any]:
    raw_serializable: dict[str, Any] = {}
    for k, v in r.raw.items():
        if v is None:
            raw_serializable[k] = None
        elif isinstance(v, (str, int, float, bool)):
            raw_serializable[k] = v
        else:
            raw_serializable[k] = str(v)
    return {
        "source_row_index": r.source_row_index,
        "reasons": r.reasons,
        "raw": raw_serializable,
    }


def column_mappings_from_dicts(items: list[dict[str, Any]]) -> list[ColumnMapping]:
    """Round-trip helper used by `commit` to rehydrate a mapping from JSON."""
    out: list[ColumnMapping] = []
    for it in items:
        out.append(ColumnMapping(
            column_index=int(it["column_index"]),
            header_text=str(it.get("header_text", "")),
            canonical_field=it.get("canonical_field"),
            confidence=float(it.get("confidence", 0.0)),
            source=str(it.get("source", "manual")),
            reason=str(it.get("reason", "")),
            sample_values=list(it.get("sample_values", [])),
        ))
    return out


# ---------------------------------------------------------------------------
# Trip grouping — combine rows that obviously belong to one truck-trip
# ---------------------------------------------------------------------------

@dataclass
class TripGroup:
    """A set of `ParsedRow`-like dicts that share a strong grouping signal
    (same tractor plate, same trip date, same dropoff). Becomes one
    `TripOrder` with N `TripContainer` children.
    """
    trip_date: str
    pickup_location: str
    dropoff_location: str
    tractor_plate: str
    driver_name: str
    customer_ref: str
    rows: list[dict[str, Any]]            # the underlying ParsedRow.values dicts


def group_rows_into_trips(
    accepted_rows: list[dict[str, Any]],
) -> list[TripGroup]:
    """Apply the grouping rule documented in `IMPORT_GENERIC_DESIGN.md`:

    - When a row carries a strong grouping signal — `tractor_plate` and/or
      `customer_ref` — group rows that share that signal **plus** trip_date
      and dropoff_location into one trip.
    - Otherwise: 1 row = 1 trip (current default).

    Input: `accepted` rows from `PreviewResult` (each has a `values` dict).
    Output: list of `TripGroup`s.
    """
    groups: dict[tuple, TripGroup] = {}
    singletons: list[TripGroup] = []

    for row in accepted_rows:
        v = row["values"] if "values" in row else row
        plate = (v.get("tractor_plate") or "").strip().upper()
        ref = (v.get("customer_ref") or "").strip()
        trip_date = v.get("trip_date") or ""
        pickup = (v.get("pickup_location") or "").strip()
        dropoff = (v.get("dropoff_location") or "").strip()

        signal = plate or ref
        if not signal:
            # No grouping signal → singleton trip
            singletons.append(TripGroup(
                trip_date=trip_date, pickup_location=pickup, dropoff_location=dropoff,
                tractor_plate=plate, driver_name=v.get("driver_name", ""),
                customer_ref=ref, rows=[v],
            ))
            continue

        key = (trip_date, dropoff, signal)
        existing = groups.get(key)
        if existing is None:
            groups[key] = TripGroup(
                trip_date=trip_date, pickup_location=pickup, dropoff_location=dropoff,
                tractor_plate=plate, driver_name=v.get("driver_name", ""),
                customer_ref=ref, rows=[v],
            )
        else:
            existing.rows.append(v)

    return list(groups.values()) + singletons
