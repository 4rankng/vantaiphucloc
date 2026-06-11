"""Batch LLM fallback for column-header classification.

Layer 3 calls this when the heuristic dictionary + pattern check both
yield confidence < 0.5 for a header. The default implementation
(``NullBatchHeaderClassifier``) returns no decisions, so the pipeline still
works end-to-end with zero LLM calls — it just leaves columns unmapped and
flagged for human review.

To enable real LLM classification, set
``settings.GEMINI_ENABLE=True`` and provide
``settings.GEMINI_API_KEY`` (already in use for OCR — see ai_service.py).
"""

from __future__ import annotations

import hashlib
import json
import logging
import time
from typing import Protocol


_logger = logging.getLogger(__name__)


class BatchHeaderClassifier(Protocol):
    async def classify_batch(
        self,
        headers: list[tuple[int, str, list[str]]],
        candidates: list[str],
    ) -> dict[int, str]:
        """Return a mapping of column index -> canonical field name (or 'skip')."""
        ...


class NullBatchHeaderClassifier:
    async def classify_batch(
        self,
        headers: list[tuple[int, str, list[str]]],
        candidates: list[str],
    ) -> dict[int, str]:
        return {}


# ---------------------------------------------------------------------------
# In-process cache with TTL so re-running the pipeline on the same file
# (preview repeatedly) doesn't re-pay the LLM cost.  Entries expire after
# 1 hour to prevent unbounded memory growth in long-running processes.
# ---------------------------------------------------------------------------

_CACHE_TTL_SECONDS = 3600  # 1 hour

_BATCH_LLM_CACHE: dict[str, tuple[dict[int, str], float]] = {}


def _batch_cache_key(headers: list[tuple[int, str, list[str]]]) -> str:
    h = hashlib.sha256()
    for idx, header, samples in headers:
        h.update(str(idx).encode("utf-8"))
        h.update(b"|")
        h.update(header.encode("utf-8"))
        for s in samples[:5]:
            h.update(b"|")
            h.update(str(s).encode("utf-8"))
        h.update(b"||")
    return h.hexdigest()


def _evict_expired() -> None:
    """Remove cache entries older than TTL."""
    now = time.monotonic()
    expired = [k for k, (_, ts) in _BATCH_LLM_CACHE.items() if now - ts > _CACHE_TTL_SECONDS]
    for k in expired:
        del _BATCH_LLM_CACHE[k]


class CachedBatchHeaderClassifier:
    def __init__(self, inner: BatchHeaderClassifier) -> None:
        self._inner = inner

    async def classify_batch(
        self,
        headers: list[tuple[int, str, list[str]]],
        candidates: list[str],
    ) -> dict[int, str]:
        if not headers:
            return {}
        key = _batch_cache_key(headers)
        cached_entry = _BATCH_LLM_CACHE.get(key)
        if cached_entry is not None:
            result, ts = cached_entry
            if time.monotonic() - ts <= _CACHE_TTL_SECONDS:
                return result
            # Expired — fall through to re-fetch
        result = await self._inner.classify_batch(headers, candidates)
        _evict_expired()
        _BATCH_LLM_CACHE[key] = (result, time.monotonic())
        return result


# ---------------------------------------------------------------------------
# Gemini-backed implementation. Wired but disabled by default — the
# settings flag keeps it inert.
# ---------------------------------------------------------------------------

def _build_batch_prompt(headers: list[tuple[int, str, list[str]]], candidates: list[str]) -> str:
    cand_list = ", ".join(candidates)

    # Format the columns to classify
    cols_text = []
    for idx, header, samples in headers:
        samples_str = ", ".join(repr(s) for s in samples[:5]) or "none"
        cols_text.append(f"Column {idx} — header: {header!r}\n  samples: {samples_str}")
    cols_formatted = "\n\n".join(cols_text)

    return f"""You are a column classifier for a Vietnamese container trucking import system.
Map each header to one canonical field.

CANONICAL FIELDS TO CHOOSE FROM:
{cand_list}
skip

RULES:
- If a column is vessel schedule (ATA/ATD/ETA), port (POL/POD), stowage (bay/slot/cell), crane, admin, or irrelevant → "skip"
- If unsure → "skip"

COLUMNS TO CLASSIFY:
{cols_formatted}
"""


class GeminiBatchClassifier:
    """Batch LLM classifier. Calls Gemini once for all unmapped columns."""

    def __init__(self) -> None:
        from app.config import settings
        self._enabled = bool(getattr(settings, "GEMINI_ENABLE", False))
        self._api_key = getattr(settings, "GEMINI_API_KEY", None)
        self._models = ["gemini-flash-latest", "gemini-flash-lite-latest"]

    async def classify_batch(
        self,
        headers: list[tuple[int, str, list[str]]],
        candidates: list[str],
    ) -> dict[int, str]:
        if not headers or not self._enabled or not self._api_key:
            return {}

        import httpx

        prompt = _build_batch_prompt(headers, candidates)

        _SCHEMA = {
            "type": "OBJECT",
            "properties": {
                "columns": {
                    "type": "ARRAY",
                    "items": {
                        "type": "OBJECT",
                        "properties": {
                            "index": {"type": "INTEGER"},
                            "field": {"type": "STRING"}
                        },
                        "required": ["index", "field"]
                    }
                }
            },
            "required": ["columns"]
        }

        for model_name in self._models:
            try:
                url = (
                    f"https://generativelanguage.googleapis.com/v1beta/"
                    f"models/{model_name}:generateContent?key={self._api_key}"
                )
                payload = {
                    "contents": [{"parts": [{"text": prompt}]}],
                    "generationConfig": {
                        "temperature": 0,
                        "maxOutputTokens": 1024,
                        "responseMimeType": "application/json",
                        "responseSchema": _SCHEMA,
                    },
                }
                async with httpx.AsyncClient(timeout=30.0) as client:
                    resp = await client.post(url, json=payload)
                    resp.raise_for_status()
                    data = resp.json()

                text = (
                    data.get("candidates", [{}])[0]
                        .get("content", {})
                        .get("parts", [{}])[0]
                        .get("text", "")
                        .strip()
                )

                from app.contexts.operations.infrastructure.import_pipeline.canonical import SKIP_FIELD

                parsed = json.loads(text)
                result = {}
                for col in parsed.get("columns", []):
                    idx = col.get("index")
                    if idx is None:
                        continue
                    field = col.get("field", "").strip().lower()
                    if field == "skip":
                        result[idx] = SKIP_FIELD
                    elif any(field == c.lower() for c in candidates):
                        matched = next(c for c in candidates if c.lower() == field)
                        result[idx] = matched
                return result
            except Exception as exc:
                _logger.warning("[Batch classify] %s failed: %s", model_name, exc)

        _logger.warning("[Batch classify] all models failed")
        return {}


def get_batch_classifier() -> BatchHeaderClassifier:
    """Factory used by the pipeline. Honours ``settings.GEMINI_ENABLE``."""
    try:
        from app.config import settings
        if getattr(settings, "GEMINI_ENABLE", False):
            return CachedBatchHeaderClassifier(GeminiBatchClassifier())
    except Exception:
        pass
    return CachedBatchHeaderClassifier(NullBatchHeaderClassifier())
