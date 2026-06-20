"""Layer 1 — pick the sheet that contains the order data.

Score every visible sheet by how strongly it looks like a tabular list of
container-level rows. Hidden empty templates (common in customer files —
see the Hai An loading list) score zero and lose; the consolidated `TOTAL`
sheet wins.

Returns sheets in descending-score order. The pipeline takes the top one
unless the user explicitly overrides.
"""

from __future__ import annotations

import re
from dataclasses import dataclass

from app.contexts.operations.infrastructure.import_pipeline.canonical import (
    EXACT_LOOKUP,
    SKIP_EXACT,
    is_skip_header,
    normalize_header_text,
    synonym_substring_match,
)
from app.contexts.operations.infrastructure.import_pipeline.workbook import SheetView


CONTAINER_NO_RE = re.compile(r"^[A-Z]{4}\d{7}$")
SIZE_TOKEN_RE = re.compile(
    r"\b(20|22|40|42|45)(?:DC|GP|HC|RF|RE|G[01]|R[01]|T0|U0)?$", re.IGNORECASE
)
ERROR_RE = re.compile(r"^#(REF|VALUE|NAME|N/A|DIV/0|NULL)!?")


@dataclass
class SheetScore:
    sheet: SheetView
    score: float
    container_hits: int
    size_hits: int
    header_synonym_hits: int
    error_count: int
    tabular_rows: int


def score_sheets(sheets: list[SheetView]) -> list[SheetScore]:
    return sorted(
        (_score_one(s) for s in sheets),
        key=lambda x: -x.score,
    )


def _score_one(sheet: SheetView) -> SheetScore:
    if sheet.state == "veryHidden":
        return SheetScore(
            sheet,
            score=-1,
            container_hits=0,
            size_hits=0,
            header_synonym_hits=0,
            error_count=0,
            tabular_rows=0,
        )

    # `container_hits` counts containers that appear ALONE in a row —
    # the canonical "tabular list of containers" pattern. Rows with ≥ 2
    # containers are tracked separately because they signal stowage /
    # side-by-side diagrams, not order lists.
    container_hits = 0
    size_hits = 0
    error_count = 0
    tabular_rows = 0
    header_synonym_hits_max = 0
    duplicate_header_penalty = 0
    multi_container_rows = 0
    multi_container_total = 0

    # Look at the first 25 rows for header keyword density and the rest
    # for value patterns.
    for r_idx, row in enumerate(sheet.rows):
        non_empty = 0
        row_synonym_hits = 0
        seen_headers: dict[str, int] = {}
        row_container_count = 0
        for cell in row:
            if cell is None or cell == "":
                continue
            non_empty += 1
            if isinstance(cell, str):
                s = cell.strip()
                if not s:
                    continue
                if ERROR_RE.match(s):
                    error_count += 1
                    continue
                up = s.upper()
                if CONTAINER_NO_RE.match(up):
                    row_container_count += 1
                    continue
                if SIZE_TOKEN_RE.match(s) and len(s) <= 6:
                    size_hits += 1
                    continue
                if r_idx < 25 and len(s) <= 60:
                    norm = normalize_header_text(s)
                    if (
                        norm in EXACT_LOOKUP
                        or norm in SKIP_EXACT
                        or synonym_substring_match(norm)
                        or is_skip_header(norm)
                    ):
                        row_synonym_hits += 1
                        # Track repeated headers to detect "side-by-side
                        # 3-column-block" layouts (e.g., Glory Shanghai's
                        # stowage diagram repeats Container/Hãng tàu 3
                        # times). They produce inflated synonym hit
                        # counts but aren't real tabular data.
                        seen_headers[norm] = seen_headers.get(norm, 0) + 1
        if non_empty >= 4:
            tabular_rows += 1
        if row_container_count == 1:
            container_hits += 1
        elif row_container_count >= 2:
            multi_container_rows += 1
            multi_container_total += row_container_count
        # A side-by-side stowage layout repeats every header 3+ times in
        # a single row. Treat such rows as "not a header row" — and if
        # we've also got many container-shaped hits in the same sheet,
        # treat the sheet itself as a stowage diagram (penalty huge).
        max_repeat = max(seen_headers.values()) if seen_headers else 1
        if max_repeat >= 3:
            row_synonym_hits = 0  # disqualify this row from header detection
            duplicate_header_penalty += 200
        if row_synonym_hits > header_synonym_hits_max:
            header_synonym_hits_max = row_synonym_hits

    # Veryhidden penalty already returned. Hidden sheets allowed but a
    # small penalty so the visible TOTAL sheet wins ties.
    hidden_penalty = 5 if sheet.state == "hidden" else 0

    # Sheets where many rows have ≥ 2 container numbers are stowage
    # diagrams, not order lists. Penalize per "ghost" container (every
    # container beyond the first in a row).
    stowage_penalty = (multi_container_total - multi_container_rows) * 5

    score = (
        container_hits * 5
        + size_hits * 1
        + tabular_rows * 0.1
        + header_synonym_hits_max * 2
        - error_count * 2
        - hidden_penalty
        - duplicate_header_penalty
        - stowage_penalty
    )

    return SheetScore(
        sheet=sheet,
        score=score,
        container_hits=container_hits,
        size_hits=size_hits,
        header_synonym_hits=header_synonym_hits_max,
        error_count=error_count,
        tabular_rows=tabular_rows,
    )
