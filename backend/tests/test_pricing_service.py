"""Tests for app.services.pricing_service.find_pricing."""

import pytest
from unittest.mock import AsyncMock, MagicMock

from app.services.pricing_service import find_pricing, _pricing_cache_key


@pytest.mark.asyncio
async def test_find_pricing_returns_matching_pricing():
    """When a matching Pricing exists, find_pricing should return it."""
    mock_pricing = MagicMock()
    mock_pricing.id = 42
    mock_pricing.client_id = 1
    mock_pricing.work_type = "E20"
    mock_pricing.route = "SG-BD"
    mock_pricing.unit_price = 500000
    mock_pricing.driver_salary = 200000
    mock_pricing.allowance = 50000

    scalar_result = MagicMock()
    scalar_result.scalar_one_or_none.return_value = mock_pricing

    mock_db = AsyncMock()
    mock_db.execute.return_value = scalar_result

    result = await find_pricing(
        db=mock_db,
        client_id=1,
        work_type="E20",
        route="SG-BD",
    )

    assert result is mock_pricing
    assert result.client_id == 1
    assert result.work_type == "E20"
    assert result.route == "SG-BD"


@pytest.mark.asyncio
async def test_find_pricing_returns_none_when_no_match():
    """When no matching Pricing exists, find_pricing should return None."""
    scalar_result = MagicMock()
    scalar_result.scalar_one_or_none.return_value = None

    mock_db = AsyncMock()
    mock_db.execute.return_value = scalar_result

    result = await find_pricing(
        db=mock_db,
        client_id=999,
        work_type="E40",
        route="UNKNOWN",
    )

    assert result is None


def test_pricing_cache_key_deterministic():
    """Cache key should be deterministic for the same inputs."""
    key1 = _pricing_cache_key(1, "E20", "SG-BD")
    key2 = _pricing_cache_key(1, "E20", "SG-BD")
    assert key1 == key2


def test_pricing_cache_key_differs_for_different_inputs():
    """Cache key should differ for different inputs."""
    key1 = _pricing_cache_key(1, "E20", "SG-BD")
    key2 = _pricing_cache_key(2, "E20", "SG-BD")
    assert key1 != key2


@pytest.mark.asyncio
async def test_find_pricing_with_cache_hit():
    """When cache returns a hit, should look up by cached id."""
    mock_pricing = MagicMock()
    mock_pricing.id = 10

    scalar_result = MagicMock()
    scalar_result.scalar_one_or_none.return_value = mock_pricing

    mock_db = AsyncMock()
    mock_db.execute.return_value = scalar_result

    mock_cache = AsyncMock()
    mock_cache.get_json.return_value = {"id": 10}

    result = await find_pricing(
        db=mock_db,
        client_id=1,
        work_type="E20",
        route="SG-BD",
        cache=mock_cache,
    )

    assert result is mock_pricing
    # Should have called get_json for cache lookup
    mock_cache.get_json.assert_called_once()
