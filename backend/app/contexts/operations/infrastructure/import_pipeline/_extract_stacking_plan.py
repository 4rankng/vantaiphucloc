"""Stacking Plan extractor (depot gate-out / bay arrangement)."""

from __future__ import annotations

from app.contexts.operations.infrastructure.import_pipeline._extractor_common import (
    ExtractedRow,
    build_fe_lookup,
    cell_text,
    cell_upper,
    is_container_header,
    vessel_from_filename,
)
from app.contexts.operations.infrastructure.import_pipeline.pattern_detector import (
    _score_stacking_plan,
)
from app.contexts.operations.infrastructure.import_pipeline.value_parsers import (
    build_cont_type,
    parse_container_no,
)
from app.contexts.operations.infrastructure.import_pipeline.workbook import SheetView


def extract_stacking_plan(
    sheets: list[SheetView], filename: str = ""
) -> tuple[list[ExtractedRow], list[dict]]:
    """Extract from Stacking Plan (depot format).

    Handles simple stacking plans with a single container column.
    Cross-references EIR/System Export sheets for F/E data when available.
    Defaults F/E to E (empty) when no cross-reference found.
    """
    # Find stacking plan sheet and collect other sheets for F/E lookup
    sheet = None
    other_sheets: list[SheetView] = []
    for s in sheets:
        if s.state == "veryHidden":
            continue
        if sheet is None:
            if _score_stacking_plan(s) >= 0.6:
                sheet = s
                continue
        other_sheets.append(s)
    if not sheet:
        return [], []

    vessel_name = vessel_from_filename(filename)

    # Build F/E lookup from other sheets (EIR log, system export)
    fe_lookup: dict[str, str] = {}
    for other in other_sheets:
        lookup = build_fe_lookup(other)
        if lookup:
            fe_lookup = lookup
            break

    # Find header row with container + size/position columns
    header_idx = None
    cont_col = None
    size_col = None
    pos_col = None

    for r in range(min(15, len(sheet.rows))):
        row = sheet.rows[r]
        for c, cell in enumerate(row):
            t = cell_upper(cell)
            if is_container_header(cell):
                cont_col = c
            elif "KÍCH THƯỚC" in t or "SIZE" in t or "SZ" in t or "KICH THUOC" in t:
                size_col = c
            elif "VỊ TRÍ" in t or "VI TRI" in t or "VITRI" in t:
                pos_col = c
        if cont_col is not None and (size_col is not None or pos_col is not None):
            header_idx = r
            break

    if header_idx is None:
        return [], []

    accepted: list[ExtractedRow] = []
    rejected: list[dict] = []

    for r in range(header_idx + 1, len(sheet.rows)):
        row = sheet.rows[r]
        cont_val = (
            cell_text(row[cont_col])
            if cont_col is not None and cont_col < len(row)
            else ""
        )
        if not cont_val:
            continue

        try:
            cont_no = parse_container_no(cont_val)
        except ValueError:
            rejected.append(
                {"source_row_index": r, "reason": "bad_container_no", "raw": cont_val}
            )
            continue

        size_val = (
            cell_text(row[size_col])
            if size_col is not None and size_col < len(row)
            else ""
        )
        pos_val = (
            cell_text(row[pos_col])
            if pos_col is not None and pos_col < len(row)
            else ""
        )

        fe_unknown = cont_no not in fe_lookup
        fe = fe_lookup.get(cont_no, "E")
        work_type = build_cont_type(fe, size_val)

        accepted.append(
            ExtractedRow(
                container_number=cont_no,
                cont_type=work_type,
                pickup=pos_val,
                dropoff="",
                vessel_name=vessel_name,
                source_row_index=r,
                freight_kind_unknown=fe_unknown,
            )
        )

    return accepted, rejected
