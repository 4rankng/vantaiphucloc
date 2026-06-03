"""Pattern detection for known shipping Excel formats.

Detects the data *shape* inside each sheet — not the sheet name — to
identify which extractor to use.  Returns ``None`` when no known pattern
matches so the generic pipeline can take over.
"""

from __future__ import annotations

import re
from dataclasses import dataclass

from app.contexts.operations.infrastructure.import_pipeline.workbook import SheetView


DETECTION_THRESHOLD = 0.6


@dataclass
class DetectedPattern:
    pattern_name: str   # "bay_plan" | "loading_list" | "invoice" | "settlement_list"
    confidence: float
    sheet_index: int


def detect_pattern(sheets: list[SheetView], filename: str = "") -> DetectedPattern | None:
    """Score every visible sheet and return the best match above threshold."""
    best: DetectedPattern | None = None
    for idx, sheet in enumerate(sheets):
        if sheet.state == "veryHidden":
            continue
        scores = {
            "bay_plan": _score_bay_plan(sheet),
            "loading_list": _score_loading_list(sheet),
            "invoice": _score_invoice(sheet),
            "settlement_list": _score_settlement_list(sheet),
        }
        for name, score in scores.items():
            if score >= DETECTION_THRESHOLD:
                if best is None or score > best.confidence:
                    best = DetectedPattern(
                        pattern_name=name, confidence=score, sheet_index=idx,
                    )
    return best


# ---------------------------------------------------------------------------
# Scoring helpers
# ---------------------------------------------------------------------------

_CONTAINER_SYNONYMS = {
    "CONTAINER", "CONTAINER NO", "CONTAINERNO", "CONTNO",
    "CONT NO", "CONTAINER ID", "CTR NO", "CTNR", "CONTAINER#",
    "SỐ CONTAINER", "SO CONTAINER", "SỐ CONT", "SO CONT",
    "SỐCONTAINER", "SOCONTAINER",  # no-space variant from SL sheets
    "MÃ CONT", "MA CONT", "MÃ CONTAINER", "MA CONTAINER",
    "หมายเลขตู้", "CONT",
}
_PORT_CODE_RE = re.compile(r"^[A-Z]{2,5}$")


def _cell_text(cell) -> str:
    if cell is None:
        return ""
    return str(cell).strip()


def _cell_upper(cell) -> str:
    return _cell_text(cell).upper()


def is_container_header(cell) -> bool:
    """True if the cell is a Container NUMBER header.

    Accepts "Container", "Số Container", "หมายเลขตู้" etc.
    Rejects "Vị trí Container", "Loại Container" which also contain
    the word but refer to position/type.
    """
    t = _cell_upper(cell)
    if t in _CONTAINER_SYNONYMS:
        return True
    return (t.startswith("CONTAINER") or t.startswith("SỐ CONT") or t.startswith("SO CONT")
            or t.startswith("SỐCONT") or t.startswith("SOCONT"))


def _score_bay_plan(sheet: SheetView) -> float:
    """Bay Plan: 3+ repeated Container NUMBER headers at regular intervals."""
    for r in range(min(10, len(sheet.rows))):
        row = sheet.rows[r]
        container_cols: list[int] = []
        for c, cell in enumerate(row):
            if is_container_header(cell):
                container_cols.append(c)
        if len(container_cols) < 3:
            continue
        # Check spacing: columns should be roughly equally spaced
        diffs = [container_cols[i + 1] - container_cols[i] for i in range(len(container_cols) - 1)]
        if diffs and max(diffs) - min(diffs) <= 2:
            # Check any row above the header for port codes
            port_boost = 0.0
            for r2 in range(r):
                prev = sheet.rows[r2]
                port_count = sum(
                    1 for c in range(min(sheet.n_cols, max(container_cols) + 1))
                    if c < len(prev) and _PORT_CODE_RE.match(_cell_text(prev[c]))
                )
                if port_count >= 2:
                    port_boost = 0.15
                    break
            return min(1.0, 0.8 + port_boost)
    return 0.0


def _score_loading_list(sheet: SheetView) -> float:
    """Loading List: header row with CONTAINERNo. + F/E + SIZE after vessel info block."""
    has_container_header = False
    has_fe_header = False
    has_size_header = False
    header_row_idx = -1

    for r in range(8, min(16, len(sheet.rows))):
        row = sheet.rows[r]
        for cell in row:
            t = _cell_text(cell).upper()
            if "CONTAINERNO" in t or "CONTAINER NO" in t:
                has_container_header = True
                header_row_idx = r
            if t in ("F/E", "FE", "F E"):
                has_fe_header = True
            if t == "SIZE" or t == "SZ":
                has_size_header = True
        if has_container_header and has_fe_header and has_size_header:
            break

    if not (has_container_header and has_fe_header and has_size_header):
        return 0.0

    score = 0.7

    # Boost: vessel info in rows 1-10
    for r in range(min(10, len(sheet.rows))):
        row_text = " ".join(_cell_text(c) for c in sheet.rows[r]).upper()
        if "VESSEL" in row_text or "PORT OF LOADING" in row_text:
            score += 0.15
            break

    return min(1.0, score)


def _score_invoice(sheet: SheetView) -> float:
    """Invoice: header row with SỐCONT + H/R + TÀU after invoice header block."""
    has_socont = False
    has_hr = False
    has_tau = False

    for r in range(11, min(20, len(sheet.rows))):
        row = sheet.rows[r]
        for cell in row:
            t = _cell_text(cell).upper()
            if "SỐCONT" in t or "SOCONT" in t or "SO CONT" in t:
                has_socont = True
            if "H/R" in t or t == "HR":
                has_hr = True
            if "TÀU" in t or t == "TAU":
                has_tau = True
        if has_socont and has_hr and has_tau:
            break

    if not (has_socont and has_hr and has_tau):
        return 0.0

    score = 0.75

    # Boost: NƠI LẤY / NƠI TRẢ columns
    for r in range(11, min(20, len(sheet.rows))):
        row_text = " ".join(_cell_text(c) for c in sheet.rows[r]).upper()
        if "NƠI LẤY" in row_text or "NOI LAY" in row_text:
            score += 0.15
            break

    return min(1.0, score)


# ---------------------------------------------------------------------------
# Settlement List  (BẢNG KÊ QUYẾT TOÁN — Vietnamese reconciliation)
# ---------------------------------------------------------------------------

_SETTLEMENT_WT_HEADERS = {"F20", "F40", "E20", "E40"}


def _score_settlement_list(sheet: SheetView) -> float:
    """Settlement List (BẢNG KÊ QUYẾT TOÁN): pivoted F20'/F40'/E20'/E40' columns.

    This is the standard Vietnamese logistics reconciliation format where each
    row has 1 in one work-type column and None in the others.
    """
    has_socont = False
    wt_cols = 0
    header_found = False

    for r in range(min(15, len(sheet.rows))):
        row = sheet.rows[r]
        for cell in row:
            if is_container_header(cell):
                has_socont = True
                header_found = True
                break

        if header_found:
            # Count work-type columns in the same row
            for cell in row:
                t = _cell_text(cell).upper().strip().rstrip("'\"")
                if t in _SETTLEMENT_WT_HEADERS:
                    wt_cols += 1

    if not has_socont or wt_cols < 2:
        return 0.0

    score = 0.7 + min(wt_cols * 0.05, 0.2)

    # Boost: title row with BẢNG KÊ
    for r in range(min(10, len(sheet.rows))):
        row_text = " ".join(_cell_text(c) for c in sheet.rows[r]).upper()
        if "BẢNG KÊ" in row_text or "BANG KE" in row_text:
            score += 0.1
            break

    return min(1.0, score)
