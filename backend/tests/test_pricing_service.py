"""Tests for app.services.pricing_service."""

import pytest
from unittest.mock import AsyncMock, MagicMock

from app.contexts.customer_pricing.infrastructure.pricing_lookup import (
    _pricing_cache_key,
    find_pricing,
    find_tiered_pricing,
)


@pytest.mark.asyncio
async def test_find_pricing_returns_matching_pricing():
    """When a matching Pricing exists, find_pricing returns it."""
    mock_pricing = MagicMock()
    mock_pricing.id = 42
    mock_pricing.client_id = 1
    mock_pricing.work_type = "E20"

    scalar_result = MagicMock()
    scalar_result.scalar_one_or_none.return_value = mock_pricing

    mock_db = AsyncMock()
    mock_db.execute.return_value = scalar_result

    result = await find_pricing(
        db=mock_db, client_id=1, work_type="E20",
        pickup_location_id=10, dropoff_location_id=20,
    )

    assert result is mock_pricing
    assert result.client_id == 1
    assert result.work_type == "E20"


@pytest.mark.asyncio
async def test_find_pricing_returns_none_when_no_match():
    scalar_result = MagicMock()
    scalar_result.scalar_one_or_none.return_value = None

    mock_db = AsyncMock()
    mock_db.execute.return_value = scalar_result

    result = await find_pricing(
        db=mock_db, client_id=999, work_type="E40",
        pickup_location_id=1, dropoff_location_id=2,
    )

    assert result is None


@pytest.mark.asyncio
async def test_find_pricing_returns_none_when_locations_unresolvable():
    """No name → no id resolution → no lookup → None."""
    mock_db = AsyncMock()
    res = MagicMock()
    res.scalar_one_or_none.return_value = None
    mock_db.execute.return_value = res

    result = await find_pricing(
        db=mock_db, client_id=1, work_type="E20",
        pickup_location="Unknown Place", dropoff_location="Other Unknown",
    )
    assert result is None


def test_pricing_cache_key_deterministic():
    key1 = _pricing_cache_key(1, "E20", 10, 20)
    key2 = _pricing_cache_key(1, "E20", 10, 20)
    assert key1 == key2


def test_pricing_cache_key_differs_for_different_inputs():
    key1 = _pricing_cache_key(1, "E20", 10, 20)
    key2 = _pricing_cache_key(2, "E20", 10, 20)
    assert key1 != key2
    key3 = _pricing_cache_key(1, "E20", 10, 21)
    assert key1 != key3


@pytest.mark.asyncio
async def test_find_pricing_with_cache_hit():
    """When cache returns a hit, looks up by cached id."""
    mock_pricing = MagicMock()
    mock_pricing.id = 10

    scalar_result = MagicMock()
    scalar_result.scalar_one_or_none.return_value = mock_pricing

    mock_db = AsyncMock()
    mock_db.execute.return_value = scalar_result

    mock_cache = AsyncMock()
    mock_cache.get_json.return_value = {"id": 10}

    result = await find_pricing(
        db=mock_db, client_id=1, work_type="E20",
        pickup_location_id=10, dropoff_location_id=20,
        cache=mock_cache,
    )

    assert result is mock_pricing
    mock_cache.get_json.assert_called_once()


@pytest.mark.asyncio
async def test_find_tiered_pricing_returns_none_when_no_line():
    mock_pricing = MagicMock()
    mock_pricing.id = 1
    mock_pricing.is_active = True

    no_line = MagicMock()
    no_line.scalar_one_or_none.return_value = None

    pricing_result = MagicMock()
    pricing_result.scalar_one_or_none.return_value = mock_pricing

    mock_db = AsyncMock()
    mock_db.execute.side_effect = [pricing_result, no_line, no_line]

    result = await find_tiered_pricing(
        db=mock_db, client_id=1, work_type="E20",
        pickup_location_id=1, dropoff_location_id=2,
    )
    assert result is None


@pytest.mark.asyncio
async def test_find_tiered_pricing_uses_line_financials():
    mock_pricing = MagicMock()
    mock_pricing.id = 1
    mock_pricing.is_active = True

    mock_line = MagicMock()
    mock_line.unit_price = 900000
    mock_line.driver_salary = 350000

    pricing_result = MagicMock()
    pricing_result.scalar_one_or_none.return_value = mock_pricing

    line_result = MagicMock()
    line_result.scalar_one_or_none.return_value = mock_line

    mock_db = AsyncMock()
    mock_db.execute.side_effect = [pricing_result, line_result]

    result = await find_tiered_pricing(
        db=mock_db, client_id=1, work_type="E20",
        pickup_location_id=1, dropoff_location_id=2,
    )

    assert result is not None
    assert result.unit_price == 900000
    assert result.driver_salary == 350000
