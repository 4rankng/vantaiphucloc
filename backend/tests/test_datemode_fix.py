import xlrd
from app.contexts.operations.infrastructure.import_pipeline.workbook import (
    _xls_cell_value,
)


def test_xls_1904_mode_date_normalized_to_1900():
    """A 1904-mode xls cell with serial 0 should normalize to 1900-01-01, not 1904-01-01."""

    class MockCell:
        ctype = xlrd.XL_CELL_DATE
        value = 0  # serial 0 in 1904 mode = 1904-01-01

    class MockWb:
        datemode = 1  # 1904 system

    result = _xls_cell_value(MockCell(), MockWb())
    # After normalization, serial 0 in 1904 mode should become serial 1462 in 1900 mode
    # which corresponds to 1904-01-01 in the 1900 epoch
    assert result.year == 1904
    assert result.month == 1
    assert result.day == 1


def test_xls_1900_mode_date_unchanged():
    """A 1900-mode xls cell should pass through unchanged."""

    class MockCell:
        ctype = xlrd.XL_CELL_DATE
        value = 0  # serial 0 in 1900 mode = 1899-12-30 (with Excel's leap-year bug, 1900-01-00)
        # Use serial 2 = 1900-01-01 in 1900 mode (xlrd compensates for Excel's 1900 bug)

    class MockWb:
        datemode = 0  # 1900 system

    # For datemode=0, serial 2 = 1900-01-02 (xlrd counts from 1899-12-30)
    cell = MockCell()
    cell.value = 2
    result = _xls_cell_value(cell, MockWb())
    assert result.year == 1900
    assert result.month == 1
    assert result.day == 2
