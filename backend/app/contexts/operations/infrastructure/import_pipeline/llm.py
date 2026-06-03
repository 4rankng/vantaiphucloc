"""LLM fallback for column-header classification.

Layer 3 calls this when the heuristic dictionary + pattern check both
yield confidence < 0.5 for a header. The default implementation
(`NullHeaderClassifier`) returns no decision, so the pipeline still works
end-to-end with zero LLM calls — it just leaves the column unmapped and
flagged for human review.

To enable real LLM classification, set
`settings.IMPORT_LLM_FALLBACK_ENABLED=True` and provide
`settings.GEMINI_API_KEY` (already in use for OCR — see ai_service.py).
"""

from __future__ import annotations

import hashlib
import json
import logging
from typing import Protocol


_logger = logging.getLogger(__name__)


class HeaderClassifier(Protocol):
    async def classify(
        self,
        header_text: str,
        sample_values: list[str],
        candidates: list[str],
    ) -> tuple[str | None, float]:
        """Return (canonical_field_name | None, confidence in [0,1])."""
        ...


class NullHeaderClassifier:
    """Default — never returns a guess. Keeps imports working with no
    external dependencies."""

    async def classify(
        self,
        header_text: str,
        sample_values: list[str],
        candidates: list[str],
    ) -> tuple[str | None, float]:
        return None, 0.0


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
# In-process cache so re-running the pipeline on the same file (preview
# repeatedly) doesn't re-pay the LLM cost.
# ---------------------------------------------------------------------------

_LLM_CACHE: dict[str, tuple[str | None, float]] = {}


def _cache_key(header: str, samples: list[str]) -> str:
    h = hashlib.sha256()
    h.update(header.encode("utf-8"))
    for s in samples[:5]:
        h.update(b"|")
        h.update(str(s).encode("utf-8"))
    return h.hexdigest()


class CachedHeaderClassifier:
    """Wraps any HeaderClassifier with a sha256-keyed in-process cache."""

    def __init__(self, inner: HeaderClassifier) -> None:
        self._inner = inner

    async def classify(
        self,
        header_text: str,
        sample_values: list[str],
        candidates: list[str],
    ) -> tuple[str | None, float]:
        key = _cache_key(header_text, sample_values)
        cached = _LLM_CACHE.get(key)
        if cached is not None:
            return cached
        result = await self._inner.classify(header_text, sample_values, candidates)
        _LLM_CACHE[key] = result
        return result


_BATCH_LLM_CACHE: dict[str, dict[int, str]] = {}

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
        cached = _BATCH_LLM_CACHE.get(key)
        if cached is not None:
            return cached
        result = await self._inner.classify_batch(headers, candidates)
        _BATCH_LLM_CACHE[key] = result
        return result


# ---------------------------------------------------------------------------
# Gemini-backed implementation. Wired but disabled by default — the
# settings flag keeps it inert.
# ---------------------------------------------------------------------------

class GeminiHeaderClassifier:
    """Real LLM classifier. Calls Gemini once per (header, samples).

    Returns (None, 0.0) on any error so the pipeline never fails because
    of the LLM.
    """

    def __init__(self) -> None:
        # Lazy-import inside __init__ so the module loads even when the
        # settings module / Gemini deps are missing.
        from app.config import settings
        self._enabled = bool(getattr(settings, "GEMINI_ENABLE", False))
        self._api_key = getattr(settings, "GEMINI_API_KEY", None)
        self._model = getattr(settings, "GEMINI_MODEL", "gemini-3.5-flash")

    async def classify(
        self,
        header_text: str,
        sample_values: list[str],
        candidates: list[str],
    ) -> tuple[str | None, float]:
        if not self._enabled or not self._api_key:
            return None, 0.0
        try:
            import httpx
            prompt = _build_prompt(header_text, sample_values, candidates)
            url = (
                f"https://generativelanguage.googleapis.com/v1beta/"
                f"models/{self._model}:generateContent?key={self._api_key}"
            )
            payload = {
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {
                    "temperature": 0, 
                    "maxOutputTokens": 64,
                    "responseMimeType": "application/json",
                    "responseSchema": {
                        "type": "OBJECT",
                        "properties": {
                            "field": {"type": "STRING"}
                        },
                        "required": ["field"]
                    }
                },
            }
            async with httpx.AsyncClient(timeout=15.0) as client:
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

            try:
                parsed = json.loads(text)
                return _parse_llm_response(parsed.get("field", ""), candidates)
            except json.JSONDecodeError:
                return None, 0.0
        except Exception as exc:  # pragma: no cover - external service
            _logger.warning("Gemini header classify failed: %s", exc)
            return None, 0.0


def _build_prompt(header: str, samples: list[str], candidates: list[str]) -> str:
    samples_str = "\n".join(f"  - {s!r}" for s in samples[:5]) or "  (no samples)"
    cand_list = ", ".join(candidates)
    return (
        "Classify this Excel column header into one of the canonical fields used in a "
        "container-trucking system. Reply with ONLY the field name (or 'skip' if it's "
        "vessel info, port info, stowage, crane, marketing, or otherwise irrelevant).\n\n"
        f"Header text: {header!r}\n"
        f"Sample values from the column:\n{samples_str}\n\n"
        f"Allowed fields: {cand_list}, skip\n\n"
        "Rules:\n"
        "- Vessel name, voyage, ATA/ATD/ETA/ETB/ETD, port of loading/discharge, "
        "  bay/slot/cell, crane code, sales region → reply 'skip'.\n"
        "- If unsure, reply 'skip'.\n"
    )


def _parse_llm_response(text: str, candidates: list[str]) -> tuple[str | None, float]:
    if not text:
        return None, 0.0
    word = text.strip().split()[0].lower().strip(".,;:'\"")
    if word == "skip":
        from app.contexts.operations.infrastructure.import_pipeline.canonical import SKIP_FIELD
        return SKIP_FIELD, 0.7
    for c in candidates:
        if word == c.lower():
            return c, 0.65
    return None, 0.0


def get_default_classifier() -> HeaderClassifier:
    """Factory used by the pipeline. Honours `settings.GEMINI_ENABLE`."""
    try:
        from app.config import settings
        if getattr(settings, "GEMINI_ENABLE", False):
            return CachedHeaderClassifier(GeminiHeaderClassifier())
    except Exception:
        pass
    return CachedHeaderClassifier(NullHeaderClassifier())


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
        self._model = getattr(settings, "GEMINI_MODEL", "gemini-3.5-flash")

    async def classify_batch(
        self,
        headers: list[tuple[int, str, list[str]]],
        candidates: list[str],
    ) -> dict[int, str]:
        if not headers or not self._enabled or not self._api_key:
            return {}
        try:
            import httpx
            prompt = _build_batch_prompt(headers, candidates)
            url = (
                f"https://generativelanguage.googleapis.com/v1beta/"
                f"models/{self._model}:generateContent?key={self._api_key}"
            )
            payload = {
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {
                    "temperature": 0, 
                    "maxOutputTokens": 1024,
                    "responseMimeType": "application/json",
                    "responseSchema": {
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
            _logger.warning("Gemini batch header classify failed: %s", exc)
            return {}

def get_batch_classifier() -> BatchHeaderClassifier:
    """Factory used by the pipeline. Honours `settings.GEMINI_ENABLE`."""
    try:
        from app.config import settings
        if getattr(settings, "GEMINI_ENABLE", False):
            return CachedBatchHeaderClassifier(GeminiBatchClassifier())
    except Exception:
        pass
    return CachedBatchHeaderClassifier(NullBatchHeaderClassifier())
