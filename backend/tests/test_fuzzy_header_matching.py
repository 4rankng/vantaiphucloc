from app.contexts.operations.infrastructure.import_pipeline.column_mapper import fuzzy_match_header

def test_fuzzy_match_close_typo():
    """A header close to a known synonym should fuzzy-match with good confidence."""
    # "socontainer" is in SYNONYMS; "socontaner" (missing 'i') should match
    result = fuzzy_match_header("Số Contaner")  # typo: missing 'i' in container
    assert result is not None, "Should fuzzy-match a close typo"
    canonical_field, confidence = result
    assert canonical_field == "container_no"
    assert confidence >= 0.7

def test_fuzzy_match_no_match_returns_none():
    """A completely unrelated header should return None."""
    result = fuzzy_match_header("xyz blah blah")
    assert result is None or result[1] < 0.5

def test_fuzzy_match_exact_synonym():
    """An exact synonym match should return high confidence."""
    result = fuzzy_match_header("Số Container")
    assert result is not None
    canonical_field, confidence = result
    assert canonical_field == "container_no"
    assert confidence >= 0.9
