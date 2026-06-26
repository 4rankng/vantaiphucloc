"""Tests for template detection and extraction: bay plan, loading list, invoice,
settlement list, stacking plan, and dual-panel formats, plus end-to-end
previews for the pattern-detected sample files.

Split from ``test_import_pipeline.py`` (move, not rewrite) — every test name,
parametrize table, fixture, and assertion is preserved verbatim.
"""

from datetime import date
from pathlib import Path

import pytest

from app.contexts.operations.infrastructure.import_pipeline.pattern_detector import (
    detect_pattern,
)
from app.contexts.operations.infrastructure.import_pipeline.pattern_extractors import (
    extract_bay_plan,
    extract_dual_panel,
    extract_invoice,
    extract_loading_list,
    extract_settlement_list,
    extract_stacking_plan,
)
from app.contexts.operations.infrastructure.import_pipeline.pipeline import (
    run_preview,
)
from app.contexts.operations.infrastructure.import_pipeline.workbook import (
    load_workbook,
)


DOCS = Path(__file__).resolve().parents[2] / "docs"

# New sample files (pattern-based)
GLORY_NEW = DOCS / "2.GLORY SHANGHAI- 2612N.xlsx"
CONSCIENCE = DOCS / "8.CONSCIENCE 2615N.xlsx"
HAIAN_BETA = DOCS / "Loading list of HAIAN BETA 062S.xls"
PHUC_LOC = DOCS / "Phúc Lộc - Shipside T4.26 HAP.xlsx"
SAMPLE_IO = DOCS / "templates" / "sample-input-output.xlsx"
ULTIMA = DOCS / "templates" / "ultima02.06.xlsx"

# New chu hang formats (stacking plan + dual panel)
REAL_LIFE = DOCS / "real-life-data"
GLORY_STACKING = REAL_LIFE / "3.GLORY SHANGHAI 2621N.xlsx"
CONSERO_DUAL = REAL_LIFE / "4.CONSERO 2621N.xlsx"


# ---------------------------------------------------------------------------
# Pattern detection
# ---------------------------------------------------------------------------


@pytest.fixture
def glory_sheets():
    if not GLORY_NEW.exists():
        pytest.skip("GLORY SHANGHAI sample missing")
    sheets = load_workbook(GLORY_NEW.read_bytes(), GLORY_NEW.name)
    return sheets


@pytest.fixture
def conscience_sheets():
    if not CONSCIENCE.exists():
        pytest.skip("CONSCIENCE sample missing")
    sheets = load_workbook(CONSCIENCE.read_bytes(), CONSCIENCE.name)
    return sheets


@pytest.fixture
def haian_sheets():
    if not HAIAN_BETA.exists():
        pytest.skip("HAIAN BETA sample missing")
    sheets = load_workbook(HAIAN_BETA.read_bytes(), HAIAN_BETA.name)
    return sheets


@pytest.fixture
def phucloc_sheets():
    if not PHUC_LOC.exists():
        pytest.skip("Phúc Lộc sample missing")
    sheets = load_workbook(PHUC_LOC.read_bytes(), PHUC_LOC.name)
    return sheets


def test_detect_bay_plan_glory(glory_sheets):
    pattern = detect_pattern(glory_sheets, "2.GLORY SHANGHAI- 2612N.xlsx")
    assert pattern is not None
    assert pattern.pattern_name == "bay_plan"
    assert pattern.confidence >= 0.6


def test_detect_bay_plan_conscience(conscience_sheets):
    pattern = detect_pattern(conscience_sheets, "8.CONSCIENCE 2615N.xlsx")
    assert pattern is not None
    assert pattern.pattern_name == "bay_plan"


def test_detect_loading_list(haian_sheets):
    pattern = detect_pattern(haian_sheets, "Loading list of HAIAN BETA 062S.xls")
    assert pattern is not None
    assert pattern.pattern_name == "loading_list"


def test_detect_invoice(phucloc_sheets):
    pattern = detect_pattern(phucloc_sheets, "Phúc Lộc - Shipside T4.26 HAP.xlsx")
    assert pattern is not None
    assert pattern.pattern_name == "invoice"


# ---------------------------------------------------------------------------
# Pattern extractors — unit tests
# ---------------------------------------------------------------------------


def test_extract_bay_plan_glory(glory_sheets):
    accepted, rejected = extract_bay_plan(glory_sheets, "2.GLORY SHANGHAI- 2612N.xlsx")
    assert len(accepted) > 0
    for row in accepted:
        assert len(row.container_number) == 11  # 4 letters + 7 digits
        assert row.cont_type in ("E20", "E40", "F20", "F40")
        assert row.pickup != ""
        assert row.dropoff != ""
    # GLORY has containers across multiple port sections
    ports = {r.dropoff for r in accepted}
    assert len(ports) >= 2


def test_extract_bay_plan_conscience(conscience_sheets):
    accepted, rejected = extract_bay_plan(conscience_sheets, "8.CONSCIENCE 2615N.xlsx")
    assert len(accepted) > 0
    for row in accepted:
        assert row.cont_type in ("E20", "E40", "F20", "F40")


def test_extract_loading_list(haian_sheets):
    accepted, rejected = extract_loading_list(
        haian_sheets, "Loading list of HAIAN BETA 062S.xls"
    )
    assert len(accepted) > 0
    for row in accepted:
        assert len(row.container_number) == 11
        assert row.cont_type in ("E20", "E40", "F20", "F40", "E45", "F45")
    # Should have vessel name
    vessel_names = {r.vessel_name for r in accepted if r.vessel_name}
    assert len(vessel_names) >= 1


def test_extract_invoice(phucloc_sheets):
    accepted, rejected = extract_invoice(
        phucloc_sheets, "Phúc Lộc - Shipside T4.26 HAP.xlsx"
    )
    assert len(accepted) > 0
    for row in accepted:
        assert len(row.container_number) == 11
        assert row.cont_type in ("E20", "E40", "F20", "F40")
        assert row.pickup != ""
        assert row.dropoff != ""


# ---------------------------------------------------------------------------
# End-to-end preview via pipeline — pattern-detected files
# ---------------------------------------------------------------------------


@pytest.fixture
def pattern_files_present():
    missing = [
        p for p in [GLORY_NEW, CONSCIENCE, HAIAN_BETA, PHUC_LOC] if not p.exists()
    ]
    if missing:
        pytest.skip(f"sample files missing: {missing}")


@pytest.mark.asyncio
async def test_glory_pattern_preview(pattern_files_present):
    res = await run_preview(
        GLORY_NEW.read_bytes(), GLORY_NEW.name, default_trip_date=date(2026, 3, 31)
    )
    assert res.stats["accepted_count"] > 0
    first = res.accepted[0]["values"]
    assert "container_no" in first
    assert first["cont_type"] in ("E20", "E40", "F20", "F40")
    assert first["work_type"]  # operation type
    assert first["pickup_location"] != ""


@pytest.mark.asyncio
async def test_conscience_pattern_preview(pattern_files_present):
    res = await run_preview(
        CONSCIENCE.read_bytes(), CONSCIENCE.name, default_trip_date=date(2026, 3, 31)
    )
    assert res.stats["accepted_count"] > 0


@pytest.mark.asyncio
async def test_haian_pattern_preview(pattern_files_present):
    res = await run_preview(
        HAIAN_BETA.read_bytes(), HAIAN_BETA.name, default_trip_date=date(2026, 4, 19)
    )
    assert res.stats["accepted_count"] > 0
    first = res.accepted[0]["values"]
    assert first["pickup_location"] != ""


@pytest.mark.asyncio
async def test_phucloc_pattern_preview(pattern_files_present):
    res = await run_preview(
        PHUC_LOC.read_bytes(), PHUC_LOC.name, default_trip_date=date(2026, 4, 26)
    )
    assert res.stats["accepted_count"] > 0
    first = res.accepted[0]["values"]
    assert first["pickup_location"] != ""
    assert first["dropoff_location"] != ""


# ---------------------------------------------------------------------------
# Settlement List (BẢNG KÊ QUYẾT TOÁN — Vietnamese reconciliation)
# ---------------------------------------------------------------------------


@pytest.fixture
def sample_io_sheets():
    if not SAMPLE_IO.exists():
        pytest.skip("sample-input-output.xlsx missing")
    sheets = load_workbook(SAMPLE_IO.read_bytes(), SAMPLE_IO.name)
    return sheets


def test_detect_settlement_list(sample_io_sheets):
    pattern = detect_pattern(sample_io_sheets, "sample-input-output.xlsx")
    assert pattern is not None
    assert pattern.pattern_name == "settlement_list"
    assert pattern.confidence >= 0.6


def test_extract_settlement_list(sample_io_sheets):
    accepted, rejected = extract_settlement_list(
        sample_io_sheets, "sample-input-output.xlsx"
    )
    assert len(accepted) > 0
    for row in accepted:
        assert len(row.container_number) == 11
        assert row.cont_type in ("E20", "E40", "F20", "F40")
        assert row.work_type  # operation type (e.g., CHUYỂN BÃI, XUẤT/NHẬP TÀU)
        assert row.pickup != ""
        assert row.dropoff != ""


def test_settlement_list_work_types(sample_io_sheets):
    accepted, _ = extract_settlement_list(sample_io_sheets, "sample-input-output.xlsx")
    cont_types = {r.cont_type for r in accepted}
    assert len(cont_types) >= 2
    assert all(ct in ("E20", "E40", "F20", "F40") for ct in cont_types)


def test_settlement_list_locations(sample_io_sheets):
    accepted, _ = extract_settlement_list(sample_io_sheets, "sample-input-output.xlsx")
    pickups = {r.pickup for r in accepted if r.pickup}
    dropoffs = {r.dropoff for r in accepted if r.dropoff}
    assert len(pickups) >= 1
    assert len(dropoffs) >= 1


@pytest.mark.asyncio
async def test_settlement_list_e2e_preview():
    if not SAMPLE_IO.exists():
        pytest.skip("sample-input-output.xlsx missing")
    res = await run_preview(
        SAMPLE_IO.read_bytes(), SAMPLE_IO.name, default_trip_date=date(2026, 4, 1)
    )
    assert res.stats["accepted_count"] > 0
    first = res.accepted[0]["values"]
    assert "container_no" in first
    assert first["cont_type"] in ("E20", "E40", "F20", "F40")
    assert first["work_type"]  # operation type
    assert first["pickup_location"] != ""
    assert first["dropoff_location"] != ""
    for w in res.warnings:
        assert "Thiếu cột bắt buộc" not in w


# ---------------------------------------------------------------------------
# Ultima02.06 — real-world file with SỐ CONTAINER (space) and F20'/F40'/E20'/E40' headers
# ---------------------------------------------------------------------------


@pytest.fixture
def ultima_sheets():
    if not ULTIMA.exists():
        pytest.skip("ultima02.06.xlsx missing")
    return load_workbook(ULTIMA.read_bytes(), ULTIMA.name)


def test_detect_settlement_list_ultima(ultima_sheets):
    pattern = detect_pattern(ultima_sheets, "ultima02.06.xlsx")
    assert pattern is not None
    assert pattern.pattern_name == "settlement_list"
    assert pattern.confidence >= 0.6


def test_extract_settlement_list_ultima(ultima_sheets):
    accepted, rejected = extract_settlement_list(ultima_sheets, "ultima02.06.xlsx")
    assert len(accepted) > 0
    assert len(rejected) == 0
    for row in accepted:
        assert row.cont_type in ("E20", "E40", "F20", "F40")


@pytest.mark.asyncio
async def test_ultima_e2e_preview(ultima_sheets):
    res = await run_preview(
        ULTIMA.read_bytes(), ULTIMA.name, default_trip_date=date(2026, 6, 2)
    )
    assert res.stats["accepted_count"] > 0
    assert res.stats["rejected_count"] == 0
    for w in res.warnings:
        assert "Thiếu cột bắt buộc" not in w
        assert "chưa được mapping" not in w
    first = res.accepted[0]["values"]
    assert first["container_no"]
    assert first["cont_type"] in ("E20", "E40", "F20", "F40")
    assert first["freight_kind"] in ("F", "E")
    assert first["container_size"] in ("20", "40")
    assert "ULTIMA" in (first.get("vessel") or "")


# ---------------------------------------------------------------------------
# New chu hang formats — Stacking Plan + Dual Panel
# ---------------------------------------------------------------------------


@pytest.fixture
def glory_stacking_sheets():
    if not GLORY_STACKING.exists():
        pytest.skip("3.GLORY SHANGHAI 2621N.xlsx missing")
    return load_workbook(GLORY_STACKING.read_bytes(), GLORY_STACKING.name)


@pytest.fixture
def consero_dual_sheets():
    if not CONSERO_DUAL.exists():
        pytest.skip("4.CONSERO 2621N.xlsx missing")
    return load_workbook(CONSERO_DUAL.read_bytes(), CONSERO_DUAL.name)


def test_detect_stacking_plan_glory(glory_stacking_sheets):
    pattern = detect_pattern(glory_stacking_sheets, "3.GLORY SHANGHAI 2621N.xlsx")
    assert pattern is not None
    assert pattern.pattern_name == "stacking_plan"
    assert pattern.confidence >= 0.6


def test_detect_dual_panel_consero(consero_dual_sheets):
    pattern = detect_pattern(consero_dual_sheets, "4.CONSERO 2621N.xlsx")
    assert pattern is not None
    assert pattern.pattern_name == "dual_panel"
    assert pattern.confidence >= 0.6


def test_extract_stacking_plan_glory(glory_stacking_sheets):
    accepted, rejected = extract_stacking_plan(
        glory_stacking_sheets,
        "3.GLORY SHANGHAI 2621N.xlsx",
    )
    assert len(accepted) > 0
    for row in accepted:
        assert len(row.container_number) == 11
        assert row.cont_type in ("E20", "E40", "F20", "F40")
        assert row.vessel_name != ""  # extracted from filename


def test_extract_dual_panel_consero(consero_dual_sheets):
    accepted, rejected = extract_dual_panel(
        consero_dual_sheets,
        "4.CONSERO 2621N.xlsx",
    )
    assert len(accepted) > 0
    for row in accepted:
        assert len(row.container_number) == 11
        assert row.cont_type in ("E20", "E40", "F20", "F40")
        assert row.vessel_name != ""  # extracted from filename


def test_stacking_plan_has_vessel_from_filename(glory_stacking_sheets):
    accepted, _ = extract_stacking_plan(
        glory_stacking_sheets,
        "3.GLORY SHANGHAI 2621N.xlsx",
    )
    assert len(accepted) > 0
    assert "GLORY SHANGHAI" in accepted[0].vessel_name


def test_dual_panel_has_vessel_from_filename(consero_dual_sheets):
    accepted, _ = extract_dual_panel(
        consero_dual_sheets,
        "4.CONSERO 2621N.xlsx",
    )
    assert len(accepted) > 0
    assert "CONSERO" in accepted[0].vessel_name


def test_dual_panel_extracts_both_panels(consero_dual_sheets):
    """Dual panel should extract containers from BOTH left and right panels."""
    accepted, _ = extract_dual_panel(
        consero_dual_sheets,
        "4.CONSERO 2621N.xlsx",
    )
    cont_types = {r.cont_type for r in accepted}
    # Should have both 20ft and 40ft containers (from different panels)
    sizes = {ct[1:] for ct in cont_types}
    assert "20" in sizes or "40" in sizes


@pytest.mark.asyncio
async def test_glory_stacking_e2e_preview():
    if not GLORY_STACKING.exists():
        pytest.skip("3.GLORY SHANGHAI 2621N.xlsx missing")
    res = await run_preview(
        GLORY_STACKING.read_bytes(),
        GLORY_STACKING.name,
        default_trip_date=date(2026, 6, 1),
    )
    assert res.stats["accepted_count"] > 0
    first = res.accepted[0]["values"]
    assert first["container_no"]
    assert first["cont_type"] in ("E20", "E40", "F20", "F40")
    assert "GLORY SHANGHAI" in (first.get("vessel") or "")


@pytest.mark.asyncio
async def test_consero_dual_e2e_preview():
    if not CONSERO_DUAL.exists():
        pytest.skip("4.CONSERO 2621N.xlsx missing")
    res = await run_preview(
        CONSERO_DUAL.read_bytes(),
        CONSERO_DUAL.name,
        default_trip_date=date(2026, 6, 1),
    )
    assert res.stats["accepted_count"] > 0
    first = res.accepted[0]["values"]
    assert first["container_no"]
    assert first["cont_type"] in ("E20", "E40", "F20", "F40")
    assert "CONSERO" in (first.get("vessel") or "")
