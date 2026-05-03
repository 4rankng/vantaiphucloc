"""Tests for app.services.pricing_service."""

import pytest
from unittest.mock import AsyncMock, MagicMock

from app.services.pricing_service import find_pricing, find_tiered_pricing, _pricing_cache_key


@pytest.mark.asyncio
async def test_find_pricing_returns_matching_pricing():
    """When a matching Pricing exists, find_pricing should return it."""
    mock_pricing = MagicMock()
    mock_pricing.id = 42
    mock_pricing.client_id = 1
    mock_pricing.work_type = "E20"
    mock_pricing.route = "SG-BD"

    scalar_result = MagicMock()
    scalar_result.scalar_one_or_none.return_value = mock_pricing

    mock_db = AsyncMock()
    mock_db.execute.return_value = scalar_result

    result = await find_pricing(db=mock_db, client_id=1, work_type="E20", route="SG-BD")

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

    result = await find_pricing(db=mock_db, client_id=999, work_type="E40", route="UNKNOWN")

    assert result is None


def test_pricing_cache_key_deterministic():
    key1 = _pricing_cache_key(1, "E20", "SG-BD")
    key2 = _pricing_cache_key(1, "E20", "SG-BD")
    assert key1 == key2


def test_pricing_cache_key_differs_for_different_inputs():
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
        db=mock_db, client_id=1, work_type="E20", route="SG-BD", cache=mock_cache,
    )

    assert result is mock_pricing
    mock_cache.get_json.assert_called_once()


@pytest.mark.asyncio
async def test_find_tiered_pricing_returns_none_when_no_line():
    """If no PricingLine exists for the pricing, find_tiered_pricing returns None."""
    mock_pricing = MagicMock()
    mock_pricing.id = 1
    mock_pricing.client_id = 1
    mock_pricing.work_type = "E20"
    mock_pricing.route = "SG-BD"
    mock_pricing.is_active = True

    no_line = MagicMock()
    no_line.scalar_one_or_none.return_value = None

    pricing_result = MagicMock()
    pricing_result.scalar_one_or_none.return_value = mock_pricing

    mock_db = AsyncMock()
    mock_db.execute.side_effect = [pricing_result, no_line, no_line]

    result = await find_tiered_pricing(db=mock_db, client_id=1, work_type="E20", route="SG-BD")
    assert result is None


@pytest.mark.asyncio
async def test_find_tiered_pricing_uses_line_financials():
    """TieredPricing should expose financials from the matched PricingLine."""
    mock_pricing = MagicMock()
    mock_pricing.id = 1
    mock_pricing.is_active = True

    mock_line = MagicMock()
    mock_line.unit_price = 900000
    mock_line.driver_salary = 350000
    mock_line.allowance = 100000

    pricing_result = MagicMock()
    pricing_result.scalar_one_or_none.return_value = mock_pricing

    line_result = MagicMock()
    line_result.scalar_one_or_none.return_value = mock_line

    mock_db = AsyncMock()
    mock_db.execute.side_effect = [pricing_result, line_result]

    result = await find_tiered_pricing(db=mock_db, client_id=1, work_type="E20", route="SG-BD")

    assert result is not None
    assert result.unit_price == 900000
    assert result.driver_salary == 350000
    assert result.allowance == 100000
