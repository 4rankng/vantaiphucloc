import pytest
from unittest.mock import AsyncMock, MagicMock
from app.contexts.operations.infrastructure.import_pipeline.column_mapper import MappingProfilePicker


@pytest.mark.asyncio
async def test_picker_returns_mapping_on_hit():
    """If a profile matches the header signature, return its mapping."""
    mock_profile = MagicMock()
    mock_profile.id = 1
    mock_profile.column_mapping_json = '{"1": "container_number", "14": "pickup_date"}'

    repo = AsyncMock()
    repo.get_by_signature = AsyncMock(return_value=mock_profile)
    repo.mark_used = AsyncMock()

    picker = MappingProfilePicker(repo)
    result = await picker.pick(["", "Số Container", "Hãng khai thác"], [])

    assert result is not None
    assert result[1] == "container_number"
    assert result[14] == "pickup_date"
    repo.mark_used.assert_called_once_with(1)


@pytest.mark.asyncio
async def test_picker_returns_none_on_miss():
    """If no profile matches, return None."""
    repo = AsyncMock()
    repo.get_by_signature = AsyncMock(return_value=None)

    picker = MappingProfilePicker(repo)
    result = await picker.pick(["Unknown Header"], [])
    assert result is None
