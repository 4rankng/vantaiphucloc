from app.contexts.operations.infrastructure.import_pipeline._extractor_common import ExtractedRow


def _make_row(**overrides):
    """Helper to build an ExtractedRow with sensible defaults."""
    defaults = dict(
        container_number="BEAU5242811",
        cont_type="F20",
        pickup="Cát Lái",
        dropoff="Đồng Nai",
        vessel_name="Vessel A",
        source_row_index=0,
    )
    defaults.update(overrides)
    return ExtractedRow(**defaults)


def test_extracted_row_has_confidence():
    """ExtractedRow should have confidence and source fields."""
    row = _make_row()
    assert hasattr(row, "confidence")
    assert row.confidence == 1.0  # default
    assert hasattr(row, "source")
    assert row.source == "pattern"  # default


def test_extracted_row_confidence_custom():
    """ExtractedRow should accept custom confidence and source."""
    row = _make_row(confidence=0.75, source="ai")
    assert row.confidence == 0.75
    assert row.source == "ai"
