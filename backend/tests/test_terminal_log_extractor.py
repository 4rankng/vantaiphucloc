"""Tests for extract_terminal_log — BDST/VIPI terminal operations log extractor."""

from __future__ import annotations

import os

import pytest
import xlrd

from app.contexts.operations.infrastructure.import_pipeline.pattern_extractors import (
    extract_terminal_log,
)

# Repo-relative so tests run on any checkout (including CI), not just the
# dev machine. backend/tests/ -> repo root -> docs/templates/.
_REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
TEMPLATES_DIR = os.path.join(_REPO_ROOT, "docs", "templates")
BDST_PATH = os.path.join(TEMPLATES_DIR, "BDST 30.5.xls")
VIPI_PATH = os.path.join(TEMPLATES_DIR, "VIPI 28.5.xls")

CONTAINER_RE = __import__("re").compile(r"^[A-Z]{4}\d{7}$")


def _rows_from_xls(path: str) -> list[list]:
    wb = xlrd.open_workbook(path)
    sh = wb.sheet_by_index(0)
    return [
        [sh.cell_value(r, c) for c in range(sh.ncols)]
        for r in range(sh.nrows)
    ]


# ---------------------------------------------------------------------------
# BDST
# ---------------------------------------------------------------------------


class TestExtractTerminalLogBDST:
    @pytest.fixture(scope="class")
    def bdst_result(self):
        rows = _rows_from_xls(BDST_PATH)
        accepted, rejected = extract_terminal_log(rows)
        return accepted, rejected

    def test_bdst_produces_many_rows(self, bdst_result):
        accepted, _ = bdst_result
        assert len(accepted) > 500, f"Expected > 500 rows, got {len(accepted)}"

    def test_bdst_first_container(self, bdst_result):
        accepted, _ = bdst_result
        sample = accepted[0]
        assert CONTAINER_RE.match(sample.container_number), (
            f"Invalid container: {sample.container_number}"
        )

    def test_bdst_rows_have_trip_date(self, bdst_result):
        accepted, _ = bdst_result
        without_date = [r for r in accepted if r.trip_date is None]
        assert len(without_date) == 0, (
            f"{len(without_date)} rows missing trip_date"
        )

    def test_bdst_rows_have_cont_type(self, bdst_result):
        accepted, _ = bdst_result
        valid_types = {"E20", "E40", "F20", "F40"}
        invalid = [r for r in accepted if r.cont_type not in valid_types]
        assert len(invalid) == 0, (
            f"{len(invalid)} rows with invalid cont_type: "
            f"{set(r.cont_type for r in invalid)}"
        )

    def test_bdst_rows_have_work_type(self, bdst_result):
        accepted, _ = bdst_result
        work_types = set(r.work_type for r in accepted)
        # BDST has "Do tau" and "Xep tau" work types
        assert work_types, "No work_type values found"

    def test_bdst_rows_have_vessel_name(self, bdst_result):
        accepted, _ = bdst_result
        with_vessel = [r for r in accepted if r.vessel_name]
        assert len(with_vessel) > 0, "No rows have vessel_name (shipping line)"

    def test_bdst_rejected_count_reasonable(self, bdst_result):
        _, rejected = bdst_result
        # Should have very few rejections (maybe none)
        assert len(rejected) < 10, (
            f"Too many rejections: {len(rejected)}"
        )


# ---------------------------------------------------------------------------
# VIPI
# ---------------------------------------------------------------------------


class TestExtractTerminalLogVIPI:
    @pytest.fixture(scope="class")
    def vipi_result(self):
        rows = _rows_from_xls(VIPI_PATH)
        accepted, rejected = extract_terminal_log(rows)
        return accepted, rejected

    def test_vipi_produces_many_rows(self, vipi_result):
        accepted, _ = vipi_result
        assert len(accepted) > 600, f"Expected > 600 rows, got {len(accepted)}"

    def test_vipi_first_container(self, vipi_result):
        accepted, _ = vipi_result
        sample = accepted[0]
        assert CONTAINER_RE.match(sample.container_number), (
            f"Invalid container: {sample.container_number}"
        )

    def test_vipi_rows_have_trip_date(self, vipi_result):
        accepted, _ = vipi_result
        without_date = [r for r in accepted if r.trip_date is None]
        assert len(without_date) == 0, (
            f"{len(without_date)} rows missing trip_date"
        )

    def test_vipi_rows_have_cont_type(self, vipi_result):
        accepted, _ = vipi_result
        valid_types = {"E20", "E40", "F20", "F40"}
        invalid = [r for r in accepted if r.cont_type not in valid_types]
        assert len(invalid) == 0, (
            f"{len(invalid)} rows with invalid cont_type: "
            f"{set(r.cont_type for r in invalid)}"
        )

    def test_vipi_rows_have_work_type(self, vipi_result):
        accepted, _ = vipi_result
        work_types = set(r.work_type for r in accepted)
        assert work_types, "No work_type values found"

    def test_vipi_rows_have_vessel_name(self, vipi_result):
        accepted, _ = vipi_result
        with_vessel = [r for r in accepted if r.vessel_name]
        assert len(with_vessel) > 0, "No rows have vessel_name (shipping line)"

    def test_vipi_rejected_count_reasonable(self, vipi_result):
        _, rejected = vipi_result
        assert len(rejected) < 10, (
            f"Too many rejections: {len(rejected)}"
        )


# ---------------------------------------------------------------------------
# Edge cases
# ---------------------------------------------------------------------------


class TestExtractTerminalLogEdgeCases:
    def test_empty_rows(self):
        accepted, rejected = extract_terminal_log([])
        assert accepted == []
        assert rejected == []

    def test_header_only(self):
        rows = [["", "So Container", "Hang khai thac", "Kich co ISO", "F/E", "Nhap/xuat", "Loai cong vieu"]]
        accepted, rejected = extract_terminal_log(rows)
        assert accepted == []
        assert rejected == []

    def test_no_header(self):
        rows = [["foo", "bar"], ["baz", "qux"]]
        accepted, rejected = extract_terminal_log(rows)
        assert accepted == []
        assert rejected == []
