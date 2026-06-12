"""Verify BDST/VIPI/ultima header synonyms are present in SYNONYMS.

The column mapper normalises raw headers via normalize_header_text()
(which lowercases, accent-folds, collapses whitespace).  Some
customer files use no-space compact forms ("socontainer" instead of
"so container").  These tests ensure the compact forms are recognised
by checking that the corresponding *spaced* normalised form appears
in at least one synonym list, AND that a round-trip through
normalize_header_text still matches.
"""

from app.contexts.operations.infrastructure.import_pipeline.canonical import (
    SYNONYMS,
    EXACT_LOOKUP,
    SKIP_EXACT,
    normalize_header_text,
)


def _all_synonym_values() -> set[str]:
    """Flat set of every synonym string across all canonical fields."""
    return {v for vals in SYNONYMS.values() for v in vals}


def test_bdst_headers_in_synonyms():
    """Headers from BDST/VIPI that map to canonical fields should be in SYNONYMS."""
    # compact (no-space) -> spaced form that should exist in SYNONYMS
    bdst_pairs = [
        ("socontainer", "so container"),
        ("socont", "so cont"),
        ("hangkhaithac", "hang khai thac"),
        ("loaicongviec", "loai cong viec"),
        ("kiechiso", "kiech iso"),
    ]
    vals = _all_synonym_values()
    for compact, spaced in bdst_pairs:
        # The spaced form must be a synonym value somewhere
        assert spaced in vals, (
            f"BDST header '{compact}' (spaced: '{spaced}') missing from SYNONYMS"
        )


def test_bdst_skip_headers_in_skip_patterns():
    """BDST headers with no canonical field should be in SKIP_PATTERNS."""
    # These are operational fields (import/export direction, discharge method,
    # cargo origin) that don't map to any CANONICAL_FIELDS entry.
    bdst_skip_pairs = [
        ("nhapxuat", "nhap xuat"),
        ("phuongthucra", "phuong thuc ra"),
        ("hangnoingoai", "hang noi ngoai"),
    ]
    for compact, spaced in bdst_skip_pairs:
        norm = normalize_header_text(spaced)
        assert norm in SKIP_EXACT, (
            f"BDST skip header '{compact}' (normalized: '{norm}') missing from SKIP_EXACT"
        )


def test_ultima_headers_in_synonyms():
    """Headers from ultima should be in SYNONYMS (spaced form)."""
    ultima_pairs = [
        ("ngaydi", "ngay di"),
        ("chuhang", "chu hang"),
        ("tentau", "ten tau"),
        ("tacnghiep", "tac nghiep"),
    ]
    vals = _all_synonym_values()
    for compact, spaced in ultima_pairs:
        assert spaced in vals, (
            f"Ultima header '{compact}' (spaced: '{spaced}') missing from SYNONYMS"
        )


def test_fe_in_synonyms():
    """Single-token 'fe' should be a synonym for freight_kind."""
    vals = _all_synonym_values()
    assert "fe" in vals, "'fe' missing from SYNONYMS"


def test_bdst_no_space_variants_recognised():
    """No-space compact forms should resolve via EXACT_LOOKUP.

    When BDST headers have no spaces (e.g. 'socontainer'), normalising
    them should still hit EXACT_LOOKUP if the no-space variant is listed.
    """
    no_space_headers = [
        "socontainer",
        "socont",
        "hangkhaithac",
        "loaicongviec",
        "kiechiso",
        "ngaydi",
        "chuhang",
        "tentau",
        "tacnghiep",
    ]
    for raw in no_space_headers:
        norm = normalize_header_text(raw)
        assert norm in EXACT_LOOKUP, (
            f"Normalized '{raw}' -> '{norm}' not in EXACT_LOOKUP"
        )
