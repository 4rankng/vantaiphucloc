"""Tests for AI-powered schema inference (ai_inference.py).

All tests mock _call_gemini so they run without a real API key.
"""
import pytest
from unittest.mock import patch, AsyncMock


@pytest.mark.asyncio
async def test_infer_schema_returns_mapping():
    """infer_schema_with_ai should return column mappings from Gemini response."""
    from app.contexts.operations.infrastructure.import_pipeline.ai_inference import (
        infer_schema_with_ai,
        clear_cache,
    )

    clear_cache()

    headers = ["Mã cont", "Ngày xếp", "Hãng tàu", "Kích cỡ"]
    sample_rows = [
        ["CAIU6167954", "2026-06-02", "ONE", "40"],
        ["CAIU6386850", "2026-06-02", "ONE", "40"],
    ]

    # _call_gemini returns {str_index: {field, confidence}} after internal parsing
    mock_response = {
        "0": {"field": "container_no", "confidence": 0.95},
        "1": {"field": "pickup_date", "confidence": 0.92},
        "2": {"field": "vessel", "confidence": 0.88},
        "3": {"field": "container_size", "confidence": 0.85},
    }

    with patch(
        "app.contexts.operations.infrastructure.import_pipeline.ai_inference._call_gemini",
        new_callable=AsyncMock,
    ) as mock_call:
        mock_call.return_value = mock_response
        result = await infer_schema_with_ai(headers, sample_rows)

    assert result[0].canonical_field == "container_no"
    assert result[0].confidence == 0.95
    assert result[3].canonical_field == "container_size"
    assert len(result) == 4


@pytest.mark.asyncio
async def test_infer_schema_caches_result():
    """Second call with same headers should use cache, only one API call."""
    from app.contexts.operations.infrastructure.import_pipeline.ai_inference import (
        infer_schema_with_ai,
        clear_cache,
    )

    clear_cache()

    headers = ["Mã cont", "Ngày xếp"]
    sample_rows = [["X1", "2026-01-01"]]

    with patch(
        "app.contexts.operations.infrastructure.import_pipeline.ai_inference._call_gemini",
        new_callable=AsyncMock,
    ) as mock_call:
        mock_call.return_value = {
            "0": {"field": "container_no", "confidence": 0.9},
            "1": {"field": "pickup_date", "confidence": 0.9},
        }
        await infer_schema_with_ai(headers, sample_rows)
        await infer_schema_with_ai(headers, sample_rows)
        assert mock_call.call_count == 1, (
            f"Expected 1 call (cached), got {mock_call.call_count}"
        )


@pytest.mark.asyncio
async def test_infer_schema_returns_empty_on_failure():
    """Should return empty dict, not raise, on API failure."""
    from app.contexts.operations.infrastructure.import_pipeline.ai_inference import (
        infer_schema_with_ai,
        clear_cache,
    )

    clear_cache()

    with patch(
        "app.contexts.operations.infrastructure.import_pipeline.ai_inference._call_gemini",
        new_callable=AsyncMock,
    ) as mock_call:
        mock_call.side_effect = Exception("API down")
        result = await infer_schema_with_ai(["test"], [[]])

    assert result == {}


@pytest.mark.asyncio
async def test_header_signature_differs_for_different_headers():
    """Different headers produce different signatures."""
    from app.contexts.operations.infrastructure.import_pipeline.ai_inference import (
        _header_signature,
    )

    sig_a = _header_signature(["Alpha", "Beta"])
    sig_b = _header_signature(["Gamma", "Delta"])
    assert sig_a != sig_b


@pytest.mark.asyncio
async def test_header_signature_normalises_case_and_whitespace():
    """Same headers with different casing/whitespace produce same signature."""
    from app.contexts.operations.infrastructure.import_pipeline.ai_inference import (
        _header_signature,
    )

    sig_a = _header_signature(["  Hello  ", "WORLD"])
    sig_b = _header_signature(["hello", "  world  "])
    assert sig_a == sig_b
