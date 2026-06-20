"""Layer 2 — find the header row inside a sheet.

Many customer files have a logo / title block / merged-cell banner above
the actual table. We scan the first ~25 rows and pick the row whose cells
look the most like column headers (short strings, mostly known synonyms /
skip patterns, with diverse-typed data below it).
"""

from __future__ import annotations

from dataclasses import dataclass

from app.contexts.operations.infrastructure.import_pipeline.canonical import (
    EXACT_LOOKUP,
    is_skip_header,
    normalize_header_text,
    synonym_substring_match,
)
from app.contexts.operations.infrastructure.import_pipeline.workbook import SheetView


HEADER_SCAN_DEPTH = 25


@dataclass
class HeaderHit:
    row_index: int  # 0-based row index of the header
    score: float
    synonym_hits: int
    non_empty_cells: int
    data_richness: float  # avg non-empty cells in next 5 rows


def find_header_row(
    sheet: SheetView, scan_depth: int = HEADER_SCAN_DEPTH
) -> HeaderHit | None:
    if not sheet.rows:
        return None
    best: HeaderHit | None = None
    n_scan = min(scan_depth, len(sheet.rows))

    for r in range(n_scan):
        row = sheet.rows[r]
        synonym_hits = 0
        non_empty = 0
        for cell in row:
            if cell is None or cell == "":
                continue
            if not isinstance(cell, str):
                # Headers are strings; numbers / dates here lower the score
                continue
            s = cell.strip()
            if not s or len(s) > 80:
                continue
            non_empty += 1
            norm = normalize_header_text(s)
            if not norm:
                continue
            if (
                norm in EXACT_LOOKUP
                or is_skip_header(norm)
                or synonym_substring_match(norm)
            ):
                synonym_hits += 1

        # Look ahead 5 rows for data richness
        below_total = 0
        below_rows = 0
        type_diversity = 0
        types_seen: set[str] = set()
        for r2 in range(r + 1, min(r + 6, len(sheet.rows))):
            row2 = sheet.rows[r2]
            cnt = 0
            for cell in row2:
                if cell is None or cell == "":
                    continue
                cnt += 1
                types_seen.add(type(cell).__name__)
            if cnt > 0:
                below_total += cnt
                below_rows += 1
        below_avg = (below_total / below_rows) if below_rows else 0
        type_diversity = 1 if len(types_seen) >= 2 else 0

        score = (
            synonym_hits * 4 + non_empty * 0.6 + below_avg * 0.5 + type_diversity * 2
        )
        # Hard requirement: at least 2 synonym hits — pure title rows
        # often have 4–5 short strings but no synonyms.
        if synonym_hits < 2:
            score *= 0.3

        hit = HeaderHit(
            row_index=r,
            score=score,
            synonym_hits=synonym_hits,
            non_empty_cells=non_empty,
            data_richness=below_avg,
        )
        if best is None or hit.score > best.score:
            best = hit

    if best is None or best.synonym_hits < 2:
        return None
    return best


def header_row_text(sheet: SheetView, header_index: int) -> list[str]:
    """Return the header row as a list of trimmed strings (pos N stays at idx N).

    Empty cells become empty strings so positional alignment with data rows
    is preserved.
    """
    if not (0 <= header_index < len(sheet.rows)):
        return []
    out: list[str] = []
    for cell in sheet.rows[header_index]:
        if cell is None:
            out.append("")
        else:
            out.append(str(cell).strip())
    return out
