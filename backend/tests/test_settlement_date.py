import pytest
from datetime import date

from app.contexts.operations.infrastructure.import_pipeline.pattern_extractors import (
    extract_settlement_list,
)
from app.contexts.operations.infrastructure.import_pipeline.workbook import SheetView


def _make_settlement_sheets(rows):
    """Wrap raw row data into a SheetView list suitable for extract_settlement_list."""
    n_cols = max(len(r) for r in rows) if rows else 0
    sheet = SheetView(
        name="Sheet1",
        state="visible",
        n_rows=len(rows),
        n_cols=n_cols,
        rows=rows,
    )
    return [sheet]


def test_settlement_list_trip_date_populated():
    """Regression: parse_date() result was discarded; trip_date was always None."""
    rows = [
        ["NGÀY ĐI", "CHỦ HÀNG", "SỐ CONTAINER", "F20'", "F40'", "E20'", "E40'", "TÁC NGHIỆP", "TÊN TẦU"],
        [date(2026, 6, 2), "MIPEC", "CAIU6167954", 1, "", "", "", "Xuất giao thẳng", "ULTIMA 1047SN"],
        [date(2026, 6, 2), "MIPEC", "CAIU6386850", 1, "", "", "", "Xuất giao thẳng", "ULTIMA 1047SN"],
    ]
    sheets = _make_settlement_sheets(rows)
    accepted, rejected = extract_settlement_list(sheets)
    assert len(accepted) == 2
    assert all(r.trip_date is not None for r in accepted), (
        f"trip_date not populated: {[r.trip_date for r in accepted]}"
    )
    assert all(r.trip_date == date(2026, 6, 2) for r in accepted), (
        f"trip_date wrong: {[r.trip_date for r in accepted]}"
    )


def test_settlement_list_work_type_uses_excel_value():
    """work_type should use the TÁC NGHIỆP column, not hardcode CHUYỂN BÃI."""
    rows = [
        ["NGÀY ĐI", "CHỦ HÀNG", "SỐ CONTAINER", "F20'", "F40'", "E20'", "E40'", "TÁC NGHIỆP", "TÊN TẦU"],
        [date(2026, 6, 2), "MIPEC", "CAIU6167954", 1, "", "", "", "Xuất giao thẳng", "ULTIMA 1047SN"],
    ]
    sheets = _make_settlement_sheets(rows)
    accepted, _ = extract_settlement_list(sheets)
    assert len(accepted) == 1
    assert accepted[0].work_type == "Xuất giao thẳng"


def test_settlement_list_work_type_fallback_when_no_operation():
    """work_type falls back to CHUYỂN BÃI when operation column is empty."""
    rows = [
        ["NGÀY ĐI", "CHỦ HÀNG", "SỐ CONTAINER", "F20'", "F40'", "E20'", "E40'", "TÁC NGHIỆP", "TÊN TẦU"],
        [date(2026, 6, 2), "MIPEC", "CAIU6167954", 1, "", "", "", "", "ULTIMA 1047SN"],
    ]
    sheets = _make_settlement_sheets(rows)
    accepted, _ = extract_settlement_list(sheets)
    assert len(accepted) == 1
    assert accepted[0].work_type == "CHUYỂN BÃI"
