"""Tests for terminal_log pattern detection (BDST/VIPI terminal operations logs)."""

from pathlib import Path

import pytest

from app.contexts.operations.infrastructure.import_pipeline.pattern_detector import (
    _score_terminal_log,
    detect_pattern,
)
from app.contexts.operations.infrastructure.import_pipeline.workbook import (
    SheetView,
    load_workbook,
)

TEMPLATES = Path(__file__).resolve().parent.parent.parent / "docs" / "templates"


def _load_sheets(filename: str) -> list[SheetView]:
    """Load sheets from a template file using the standard workbook loader."""
    content = (TEMPLATES / filename).read_bytes()
    return load_workbook(content, filename)


def test_terminal_log_scores_high_for_bdst():
    """BDST 30.5.xls is a terminal operations log with 34 columns."""
    sheets = _load_sheets("BDST 30.5.xls")
    assert sheets, "BDST template should have at least one sheet"
    score = _score_terminal_log(sheets[0])
    assert score >= 0.5, f"BDST should score >= 0.5, got {score}"


def test_terminal_log_scores_high_for_vipi():
    """VIPI 28.5.xls is also a terminal operations log."""
    sheets = _load_sheets("VIPI 28.5.xls")
    assert sheets, "VIPI template should have at least one sheet"
    score = _score_terminal_log(sheets[0])
    assert score >= 0.5, f"VIPI should score >= 0.5, got {score}"


def test_terminal_log_scores_low_for_ultima():
    """ultima02.06.xlsx is a settlement-style list, NOT a terminal log."""
    sheets = _load_sheets("ultima02.06.xlsx")
    assert sheets, "ultima template should have at least one sheet"
    score = _score_terminal_log(sheets[0])
    assert score < 0.3, f"ultima should score < 0.3, got {score}"


def test_detect_pattern_returns_terminal_log_for_bdst():
    """Full detect_pattern() should identify BDST as terminal_log."""
    sheets = _load_sheets("BDST 30.5.xls")
    result = detect_pattern(sheets, "BDST 30.5.xls")
    assert result is not None, "detect_pattern should return a result for BDST"
    assert result.pattern_name == "terminal_log", (
        f"Expected 'terminal_log', got '{result.pattern_name}'"
    )
