"""Tests for header matching, synonym/skip dictionaries, normalization,
pivot-column detection, classifier wiring, and container-cell splitting.

Split from ``test_import_pipeline.py`` (move, not rewrite) — every test name,
parametrize table, and assertion is preserved verbatim.
"""

from datetime import date

import pytest

from app.contexts.operations.infrastructure.import_pipeline.canonical import (
    EXACT_LOOKUP,
    is_skip_header,
    normalize_for_match,
    normalize_header_text,
    synonym_substring_match,
)
from app.contexts.operations.infrastructure.import_pipeline.column_mapper import (
    derive_pivot_value,
    detect_pivot_columns,
)
from app.contexts.operations.infrastructure.import_pipeline.llm import (
    get_batch_classifier,
)
from app.contexts.operations.infrastructure.import_pipeline.pipeline import (
    run_preview,
    _split_container_cell,
)


# ---------------------------------------------------------------------------
# Canonical / synonyms
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    "header,expected_field",
    [
        ("Số container", "container_no"),
        ("CONTAINER NO.", "container_no"),
        ("Container Id", "container_no"),
        ("CONTNo.", "container_no"),
        ("หมายเลขตู้", "container_no"),
        ("VGM (KGM)", "gross_weight_kg"),
        ("Weight", "gross_weight_kg"),
        ("F/E", "freight_kind"),
        ("Freight Kind", "freight_kind"),
        ("CY", "pickup_location"),
        ("Del Port", "dropoff_location"),
        ("Booking No", "customer_ref"),
        ("SỐCONTAINER", "container_no"),
        ("SOCONTAINER", "container_no"),
        ("Vessel", "vessel"),
        ("Tên tàu", "vessel"),
    ],
)
def test_synonym_dictionary_matches_known_headers(header: str, expected_field: str):
    norm = normalize_header_text(header)
    assert EXACT_LOOKUP.get(norm) == expected_field, (
        f"{header!r} → {EXACT_LOOKUP.get(norm)} ≠ {expected_field}"
    )


@pytest.mark.parametrize(
    "header",
    [
        "POD",
        "POL",
        "Bay",
        "Slot",
        "Cell",
        "Crane",
        "QC01",
        "Sales/Mkt",
        "Hãng tàu",
        "Phương thức ra",
        "Hàng nội/ngoại",
    ],
)
def test_skip_dictionary_classifies_vessel_and_admin(header: str):
    assert is_skip_header(normalize_header_text(header)), header


def test_substring_match_does_not_fire_inside_word():
    # "shipper" must NOT match "ship" via skip dictionary
    assert not is_skip_header(normalize_header_text("Shipper"))
    # "Hãng tàu" must NOT match "hang" / "tau" via synonym dictionary
    assert synonym_substring_match(normalize_header_text("Hãng tàu")) is None


@pytest.mark.parametrize(
    "raw,expected",
    [
        ("SỐ CONTAINER ", "socontainer"),
        ("SỐCONT", "socont"),
        ("F20'", "f20"),
        ("F40'", "f40"),
        ("E20'", "e20"),
        ("E40'", "e40"),
        ("NGÀY ĐI", "ngaydi"),
        ("Số Cont", "socont"),
        ("", ""),
        (None, ""),
        ("Chủ hàng", "chuhang"),
    ],
)
def test_normalize_for_match_strips_whitespace_and_diacritics(raw, expected):
    assert normalize_for_match(raw) == expected


# ---------------------------------------------------------------------------
# Pivot column detection (F20'/F40'/E20'/E40' as compound size+kind)
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    "header,expected_fk,expected_size",
    [
        ("F20'", "F", "20"),
        ("F40'", "F", "40"),
        ("E20'", "E", "20"),
        ("E40'", "E", "40"),
        ("F20", "F", "20"),
        ('F20"', "F", "20"),
        ("f20'", "F", "20"),
        ("F 20'", "F", "20"),
        ("  F20  ", "F", "20"),
    ],
)
def test_detect_pivot_columns_matches(header, expected_fk, expected_size):
    # Pass 2 headers so the function's min-2 threshold is satisfied; check
    # that the matching one is at index 0 (where we put it).
    pivots = detect_pivot_columns([header, "F40'"])
    assert len(pivots) == 2
    assert pivots[0].freight_kind == expected_fk
    assert pivots[0].container_size == expected_size


def test_detect_pivot_columns_ignores_non_pivot():
    assert (
        detect_pivot_columns(["Container", "Date", "F20'"]) == []
    )  # only 1 pivot → ignore


def test_detect_pivot_columns_full_sheet():
    headers = ["NGÀY ĐI", "SỐ CONT", "F20'", "F40'", "E20'", "E40'"]
    pivots = detect_pivot_columns(headers)
    assert len(pivots) == 4
    assert [(p.freight_kind, p.container_size) for p in pivots] == [
        ("F", "20"),
        ("F", "40"),
        ("E", "20"),
        ("E", "40"),
    ]
    assert [p.column_index for p in pivots] == [2, 3, 4, 5]


def test_derive_pivot_value_picks_truthy_cell():
    pivots = detect_pivot_columns(["F20'", "F40'", "E20'", "E40'"])
    assert derive_pivot_value(["1", "", "", ""], pivots).freight_kind == "F"
    assert derive_pivot_value(["1", "", "", ""], pivots).container_size == "20"
    assert derive_pivot_value(["", "1", "", ""], pivots).freight_kind == "F"
    assert derive_pivot_value(["", "", "1", ""], pivots).freight_kind == "E"
    assert derive_pivot_value(["", "", "", "1"], pivots).container_size == "40"


def test_derive_pivot_value_skips_zero_and_none():
    pivots = detect_pivot_columns(["F20'", "F40'", "E20'", "E40'"])
    assert derive_pivot_value([None, None, None, None], pivots) is None
    assert derive_pivot_value(["0", "0", "0", "0"], pivots) is None
    assert derive_pivot_value(["", "", "", ""], pivots) is None


@pytest.mark.asyncio
async def test_pivot_fallback_via_generic_pipeline(tmp_path):
    """End-to-end: a workbook with pivot headers but no separate
    container_size/freight_kind columns should still parse via the
    generic pipeline thanks to pivot fallback."""
    import openpyxl

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.append(["Ngày đi", "Số cont", "F20'", "F40'", "E20'", "E40'"])
    ws.append(["2026-06-01", "CAIU6167954", 1, 0, 0, 0])
    ws.append(["2026-06-01", "CAIU6386850", 0, 1, 0, 0])
    ws.append(["2026-06-01", "FCIU6219871", 0, 0, 1, 0])
    ws.append(["2026-06-01", "STXU2032149", 0, 0, 0, 1])
    path = tmp_path / "pivot.xlsx"
    wb.save(path)

    res = await run_preview(
        path.read_bytes(),
        path.name,
        default_trip_date=date(2026, 6, 1),
    )
    assert res.stats["accepted_count"] == 4
    assert res.stats["rejected_count"] == 0
    cont_types = [a["values"]["cont_type"] for a in res.accepted]
    assert cont_types == ["F20", "F40", "E20", "E40"]


# ---------------------------------------------------------------------------
# Chinese synonyms
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    "header,expected_field",
    [
        ("空/重", "freight_kind"),
        ("空/重(E/F)", "freight_kind"),
        ("箱子进场时间", "pickup_date"),
    ],
)
def test_chinese_synonyms(header: str, expected_field: str):
    norm = normalize_header_text(header)
    assert EXACT_LOOKUP.get(norm) == expected_field, (
        f"{header!r} → {EXACT_LOOKUP.get(norm)} ≠ {expected_field}"
    )


# ---------------------------------------------------------------------------
# Gemini is always on in prod (gated on GEMINI_API_KEY); conftest forces the
# key off for the suite. We only check the factory wiring — no network.
# ---------------------------------------------------------------------------


def test_classifier_is_null_without_api_key(monkeypatch):
    from app.config import settings

    monkeypatch.setattr(settings, "GEMINI_API_KEY", "")
    clf = get_batch_classifier()
    assert clf._inner.__class__.__name__ == "NullBatchHeaderClassifier"


def test_classifier_is_gemini_when_api_key_set(monkeypatch):
    from app.config import settings

    monkeypatch.setattr(settings, "GEMINI_API_KEY", "fake-key-for-wiring-test")
    clf = get_batch_classifier()
    assert clf._inner.__class__.__name__ == "GeminiBatchClassifier"


# ---------------------------------------------------------------------------
# Joined container-number cells: "HACU2215738/HACU2242754" → 2 trips.
# ---------------------------------------------------------------------------


def test_split_container_cell_joined_slash():
    assert _split_container_cell("HACU2215738/HACU2242754") == [
        "HACU2215738",
        "HACU2242754",
    ]


def test_split_container_cell_single_value_is_none():
    # No separator → not a join; leave to normal parsing.
    assert _split_container_cell("HACU2215738") is None


def test_split_container_cell_malformed_is_none():
    # Malformed value with no separator stays None → rejected as bad_container_no.
    assert _split_container_cell("HLHHU8208208") is None


def test_split_container_cell_one_part_invalid_is_none():
    # If any part isn't a clean container number, don't split — let normal
    # parsing reject it rather than emitting a junk record.
    assert _split_container_cell("HACU2215738/JUNK123") is None


def test_split_container_cell_empty_and_none_is_none():
    assert _split_container_cell(None) is None
    assert _split_container_cell("") is None
    assert _split_container_cell("   ") is None


def test_split_container_cell_other_separators():
    assert _split_container_cell("HACU2215738,HACU2242754") == [
        "HACU2215738",
        "HACU2242754",
    ]
    assert _split_container_cell("HACU2215738+HACU2242754") == [
        "HACU2215738",
        "HACU2242754",
    ]


def test_split_container_cell_accepts_short_painted_codes():
    assert _split_container_cell("HCVT0002/HCWT0006") == ["HCVT0002", "HCWT0006"]
