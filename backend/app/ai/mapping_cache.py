"""Cache for LLM-detected column mappings.

Stores mapping per (source_id, file_hash) so recurring customers
with consistent file formats skip the LLM call entirely.
"""

from __future__ import annotations

import logging
from typing import Any

# In-memory cache (upgrade to Redis/DB later)
# Key: (source_id, file_hash) → mapping dict
_cache: dict[str, dict[str, Any]] = {}

_logger = logging.getLogger(__name__)


def _cache_key(source_id: str | None, file_hash: str) -> str:
    return f"{source_id or 'unknown'}:{file_hash}"


def get_cached_mapping(source_id: str | None, file_hash: str) -> dict[str, Any] | None:
    """Retrieve cached column mapping if available.

    Returns:
        Cached mapping dict or None
    """
    key = _cache_key(source_id, file_hash)
    entry = _cache.get(key)
    if entry:
        _logger.info(f"Cache hit for {key}")
    return entry


def save_mapping(source_id: str | None, file_hash: str, mapping: dict[str, Any]) -> None:
    """Save a column mapping to cache."""
    key = _cache_key(source_id, file_hash)
    _cache[key] = mapping
    _logger.info(f"Cached mapping for {key}")


def clear_cache() -> int:
    """Clear all cached mappings. Returns count of cleared entries."""
    count = len(_cache)
    _cache.clear()
    return count
