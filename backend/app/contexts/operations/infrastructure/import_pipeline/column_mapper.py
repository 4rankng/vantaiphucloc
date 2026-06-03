"""Layer 3 — map each column header to a canonical field.

Strategy (per column):

1.  Heuristic dictionary lookup (`canonical.EXACT_LOOKUP`).  conf=1.0
2.  Skip-pattern check (`canonical.is_skip_header`).             conf=1.0  → SKIP_FIELD
3.  Substring match against the synonym dictionary.              conf=0.7
4.  Pattern check on the column's first 8 data values.           conf=0.5–0.95
5.  LLM fallback (default no-op).                                conf=0.6

If everything fails → mapping is None and the column is shown as
"needs review" in the preview UI.

The output is a `ColumnMapping` per column, which is JSON-serializable so
it round-trips through the API and is what we cache in
`customer_import_templates`.

Pivot columns (`F20'`, `F40'`, `E20'`, `E40'`) are a special case: a
single header encodes BOTH `container_size` and `freight_kind`. We
detect them as a group via `detect_pivot_columns()` — the pipeline
then reads the column with the `1` value per row to derive both
fields, instead of trying to map each to a single canonical field.
"""

from __future__ import annotations

import re
from dataclasses import asdict, dataclass, field
from typing import Any

from app.contexts.operations.infrastructure.import_pipeline.canonical import (
    CANONICAL_FIELD_NAMES,
    EXACT_LOOKUP,
    SKIP_FIELD,
    is_skip_header,
    normalize_for_match,
    normalize_header_text,
    synonym_substring_match,
)
from app.contexts.operations.infrastructure.import_pipeline.llm import HeaderClassifier, NullHeaderClassifier
from app.contexts.operations.infrastructure.import_pipeline.workbook import SheetView
from app.contexts.operations.infrastructure.import_pipeline.value_parsers import parse_date


CONTAINER_RE = re.compile(r"^[A-Z]{4}\d{7}$")
SIZE_VALUE_RE = re.compile(r"^(20|22|40|42|45)(?:DC|GP|HC|RF|RE|G[01]|R[01]|T0|U0)?$", re.IGNORECASE)
FE_VALUE_RE = re.compile(r"^(F|E|FULL|EMPTY)$", re.IGNORECASE)
NUMERIC_RE = re.compile(r"^[\d.,\s\-]+$")
PLATE_RE = re.compile(r"^[0-9]{2}[A-Z]\d{4,6}$", re.IGNORECASE)


# ---------------------------------------------------------------------------
# Pivot columns — headers that encode compound (size, kind) per cell.
# A typical Vietnamese reconciliation sheet has 4 such columns:
#   F20' | F40' | E20' | E40'
# Each row has a "1" in exactly one of them; that column's header tells
# us the cont_type. We keep these separate from ColumnMapping because
# they don't map to a single canonical field — they synthesize TWO.
# ---------------------------------------------------------------------------

PIVOT_HEADER_RE = re.compile(r"^([FE])\s*([0-9]{2})['\"]?$", re.IGNORECASE)


@dataclass(frozen=True)
class PivotColumn:
    """A header cell that encodes both `freight_kind` and `container_size`."""
    column_index: int
    freight_kind: str   # "F" or "E"
    container_size: str  # "20" or "40"

    def to_dict(self) -> dict[str, Any]:
        return {
            "column_index": self.column_index,
            "freight_kind": self.freight_kind,
            "container_size": self.container_size,
        }


def detect_pivot_columns(headers: list[Any]) -> list[PivotColumn]:
    """Return one `PivotColumn` per matching header, in column order.

    Matching rules (intentionally lenient — real customer files have
    trailing apostrophes, double-quotes, accidental spaces):
      - exact match: F20, F40, E20, E40 (case-insensitive)
      - with trailing punctuation: F20', F20", F20.
      - with whitespace: "F 20", "F  20", " F20 "
    All other patterns ignored.

    Returns [] if fewer than 2 pivot columns found (need at least 2 to
    be meaningful — one pivot column is just bad data).
    """
    out: list[PivotColumn] = []
    for c, cell in enumerate(headers):
        if cell is None:
            continue
        s = str(cell).strip()
        if not s:
            continue
        m = PIVOT_HEADER_RE.match(s)
        if not m:
            continue
        fk = m.group(1).upper()
        sz = m.group(2)
        if sz not in ("20", "22", "40", "42", "45"):
            continue
        if fk not in ("F", "E"):
            continue
        out.append(PivotColumn(
            column_index=c,
            freight_kind=fk,
            container_size="20" if sz in ("20", "22") else "40",
        ))
    return out if len(out) >= 2 else []


def derive_pivot_value(row: list[Any], pivots: list[PivotColumn]) -> PivotColumn | None:
    """For a data row, return the pivot column whose value is truthy.

    "Truthy" means: cell exists, isn't None/empty/0/"0", and parses as a
    number > 0 if numeric. Used by the pipeline to set size+kind per row
    when generic column mapping can't find them.

    Returns None if no pivot column fires — caller should treat as a
    bad row (missing required fields).
    """
    for p in pivots:
        if p.column_index >= len(row):
            continue
        v = row[p.column_index]
        if v is None:
            continue
        if isinstance(v, str):
            s = v.strip()
            if not s or s in ("0", "0.0"):
                continue
            try:
                if float(s) > 0:
                    return p
            except ValueError:
                continue
        elif isinstance(v, (int, float)):
            if v > 0:
                return p
    return None


@dataclass
class ColumnMapping:
    column_index: int
    header_text: str
    canonical_field: str | None     # None | one of CANONICAL_FIELD_NAMES | SKIP_FIELD
    confidence: float               # 0.0–1.0
    source: str                     # "synonym_dict" | "skip_dict" | "synonym_substr" | "value_pattern" | "llm" | "unmapped"
    reason: str = ""                # extra context (e.g., "vessel info" for skip, pattern name)
    sample_values: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        d = asdict(self)
        d["sample_values"] = list(self.sample_values)
        return d


async def map_columns(
    sheet: SheetView,
    header_row: int,
    classifier: HeaderClassifier | None = None,
    threshold: float = 0.5,
) -> list[ColumnMapping]:
    classifier = classifier or NullHeaderClassifier()
    headers = sheet.rows[header_row] if 0 <= header_row < len(sheet.rows) else []
    n_cols = max(sheet.n_cols, len(headers))

    mappings: list[ColumnMapping] = []
    for c in range(n_cols):
        header_cell = headers[c] if c < len(headers) else None
        header_text = "" if header_cell is None else str(header_cell).strip()
        samples = _column_samples(sheet, header_row, c, n=8)

        m = _heuristic_match(c, header_text, samples)
        if m.canonical_field and m.confidence >= 1.0:
            mappings.append(m)
            continue

        # Pattern fallback if heuristic didn't get to 0.7
        if not m.canonical_field or m.confidence < 0.7:
            pattern = _value_pattern_match(c, header_text, samples)
            if pattern.canonical_field and pattern.confidence > m.confidence:
                m = pattern

        # LLM fallback (only if still below threshold and we have a header)
        if (not m.canonical_field or m.confidence < threshold) and header_text:
            candidates = list(CANONICAL_FIELD_NAMES)
            field_name, conf = await classifier.classify(header_text, samples, candidates)
            if field_name and conf >= 0.5:
                m = ColumnMapping(
                    column_index=c, header_text=header_text,
                    canonical_field=field_name, confidence=conf,
                    source="llm", sample_values=samples, reason="LLM fallback",
                )

        if not m.canonical_field:
            m.source = "unmapped"
            m.reason = m.reason or "no synonym match"
        mappings.append(m)
    return mappings


# ---------------------------------------------------------------------------
# Heuristics
# ---------------------------------------------------------------------------

def _heuristic_match(c: int, header_text: str, samples: list[str]) -> ColumnMapping:
    norm = normalize_header_text(header_text)
    if not norm:
        return ColumnMapping(c, header_text, None, 0.0, "unmapped",
                             sample_values=samples,
                             reason="empty header")

    if is_skip_header(norm):
        return ColumnMapping(c, header_text, SKIP_FIELD, 1.0, "skip_dict",
                             sample_values=samples,
                             reason="vessel/port/admin column")

    field = EXACT_LOOKUP.get(norm)
    if field:
        return ColumnMapping(c, header_text, field, 1.0, "synonym_dict",
                             sample_values=samples)

    sub = synonym_substring_match(norm)
    if sub:
        return ColumnMapping(c, header_text, sub, 0.7, "synonym_substr",
                             sample_values=samples,
                             reason=f"substring of header {norm!r}")

    return ColumnMapping(c, header_text, None, 0.0, "unmapped",
                         sample_values=samples)


def _value_pattern_match(c: int, header_text: str, samples: list[str]) -> ColumnMapping:
    if not samples:
        return ColumnMapping(c, header_text, None, 0.0, "unmapped",
                             sample_values=samples)
    container_hits = sum(1 for s in samples if CONTAINER_RE.match(s.strip().upper()))
    if container_hits / max(len(samples), 1) >= 0.5:
        return ColumnMapping(
            c, header_text, "container_no",
            confidence=0.9, source="value_pattern",
            sample_values=samples, reason="ISO 6346 shape",
        )

    fe_hits = sum(1 for s in samples if FE_VALUE_RE.match(s.strip()))
    if fe_hits / max(len(samples), 1) >= 0.6:
        return ColumnMapping(
            c, header_text, "freight_kind",
            confidence=0.85, source="value_pattern",
            sample_values=samples, reason="F/E values",
        )

    size_hits = sum(1 for s in samples if SIZE_VALUE_RE.match(s.strip()))
    if size_hits / max(len(samples), 1) >= 0.6:
        return ColumnMapping(
            c, header_text, "container_size",
            confidence=0.8, source="value_pattern",
            sample_values=samples, reason="size tokens",
        )

    plate_hits = sum(1 for s in samples if PLATE_RE.match(s.strip()))
    if plate_hits / max(len(samples), 1) >= 0.5:
        return ColumnMapping(
            c, header_text, "vehicle_plate",
            confidence=0.7, source="value_pattern",
            sample_values=samples, reason="VN plate shape",
        )

    date_hits = sum(1 for s in samples if parse_date(s) is not None)
    if date_hits / max(len(samples), 1) >= 0.6:
        return ColumnMapping(
            c, header_text, "trip_date",
            confidence=0.55, source="value_pattern",
            sample_values=samples, reason="parseable dates",
        )

    return ColumnMapping(c, header_text, None, 0.0, "unmapped",
                         sample_values=samples)


def _column_samples(sheet: SheetView, header_row: int, col: int, n: int = 8) -> list[str]:
    out: list[str] = []
    if not (0 <= col):
        return out
    seen = 0
    for r in range(header_row + 1, len(sheet.rows)):
        if seen >= n:
            break
        row = sheet.rows[r]
        if col >= len(row):
            continue
        cell = row[col]
        if cell is None or cell == "":
            continue
        out.append(str(cell))
        seen += 1
    return out
