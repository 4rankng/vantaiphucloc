"""AI-powered schema inference for customer Excel imports.

Uses Gemini to propose column -> canonical_field mappings when heuristic
methods fail.  Caches results by header signature (sha256 of normalised
headers).  Returns empty dict on any failure — never raises.
"""

from __future__ import annotations

import hashlib
import json
import logging
import re
import time
from dataclasses import dataclass

_logger = logging.getLogger(__name__)

# In-process cache with TTL (1 hour, same as llm.py)
_CACHE_TTL_SECONDS = 3600
_CACHE: dict[str, tuple[dict, float]] = {}


@dataclass
class InferredColumn:
    canonical_field: str
    confidence: float


def _header_signature(headers: list[str]) -> str:
    """Stable hash of normalised headers for cache key."""
    normalised = "|".join(h.strip().lower() for h in headers if h)
    return hashlib.sha256(normalised.encode()).hexdigest()


def _evict_expired() -> None:
    """Remove cache entries older than TTL."""
    now = time.monotonic()
    expired = [k for k, (_, ts) in _CACHE.items() if now - ts > _CACHE_TTL_SECONDS]
    for k in expired:
        del _CACHE[k]


def _build_prompt(
    headers: list[str],
    sample_rows: list[list],
    field_descriptions: dict[str, str],
) -> str:
    """Build the Gemini prompt with headers + samples + canonical schema."""
    field_list = "\n".join(
        f"- {name}: {desc}" for name, desc in field_descriptions.items()
    )
    header_line = " | ".join(f"[{i}] {h}" for i, h in enumerate(headers))
    sample_lines = "\n".join(
        " | ".join(str(cell) for cell in row) for row in sample_rows[:5]
    )
    return f"""You are a data import expert. Map these Excel column headers to canonical fields.

CANONICAL FIELDS (use these exact names):
{field_list}

HEADERS (with index):
{header_line}

SAMPLE DATA (first 5 rows):
{sample_lines}

Return ONLY a JSON object: {{"<col_index>": {{"field": "<canonical_field>", "confidence": <0.0-1.0>}}}}
Use empty object {{}} for unmappable columns. Be conservative with confidence.
"""


async def _call_gemini(prompt: str) -> dict:
    """Call Gemini API with structured JSON response. Raises on failure."""
    from app.config import GEMINI_MODELS, settings

    api_key = settings.GEMINI_API_KEY
    if not api_key:
        raise ValueError("GEMINI_API_KEY not set")

    import httpx

    _SCHEMA = {
        "type": "OBJECT",
        "properties": {
            "columns": {
                "type": "ARRAY",
                "items": {
                    "type": "OBJECT",
                    "properties": {
                        "index": {"type": "INTEGER"},
                        "field": {"type": "STRING"},
                        "confidence": {"type": "NUMBER"},
                    },
                    "required": ["index", "field", "confidence"],
                },
            }
        },
        "required": ["columns"],
    }

    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.1,
            "maxOutputTokens": 8192,
            "responseMimeType": "application/json",
            "responseSchema": _SCHEMA,
        },
    }

    # Try each model until one succeeds; same fallback order as llm.py.
    last_exc: Exception | None = None
    async with httpx.AsyncClient(timeout=30.0) as client:
        for model_name in GEMINI_MODELS:
            url = (
                "https://generativelanguage.googleapis.com/v1beta/"
                f"models/{model_name}:generateContent?key={api_key}"
            )
            try:
                resp = await client.post(url, json=payload)
                resp.raise_for_status()
                data = resp.json()
            except Exception as exc:
                _logger.warning("[infer_schema] %s failed: %s", model_name, exc)
                last_exc = exc
                continue

            text = (
                data.get("candidates", [{}])[0]
                .get("content", {})
                .get("parts", [{}])[0]
                .get("text", "")
                .strip()
            )
            # Models sometimes wrap JSON in ```json fences; strip them.
            text = re.sub(r"^```(?:json)?\s*", "", text).rstrip("`").strip()

            parsed = json.loads(text)
            # Convert array-of-objects format to {col_index: {field, confidence}}
            result: dict[str, dict] = {}
            for col in parsed.get("columns", []):
                idx = col.get("index")
                if idx is None:
                    continue
                result[str(idx)] = {
                    "field": col.get("field", ""),
                    "confidence": col.get("confidence", 0.0),
                }
            return result

    raise last_exc or RuntimeError("infer_schema_with_ai: all Gemini models failed")


async def infer_schema_with_ai(
    headers: list[str],
    sample_rows: list[list],
) -> dict[int, InferredColumn]:
    """Infer column mapping using Gemini, with header-signature caching.

    Returns: {col_index: InferredColumn(canonical_field, confidence)}
    Returns empty dict on failure (never raises).
    """
    from app.contexts.operations.infrastructure.import_pipeline.canonical import (
        CANONICAL_FIELDS,
    )

    # Build {field_name: description} from CanonicalField tuples
    field_descriptions = {f.name: f.description or f.label for f in CANONICAL_FIELDS}

    sig = _header_signature(headers)

    def _to_inferred(raw: dict) -> dict[int, InferredColumn]:
        return {
            int(idx): InferredColumn(
                canonical_field=d["field"], confidence=d.get("confidence", 0.0)
            )
            for idx, d in raw.items()
            if d.get("field")
        }

    # Check cache
    cached_entry = _CACHE.get(sig)
    if cached_entry is not None:
        raw, ts = cached_entry
        if time.monotonic() - ts <= _CACHE_TTL_SECONDS:
            return _to_inferred(raw)
        # Expired — fall through to re-fetch

    try:
        prompt = _build_prompt(headers, sample_rows, field_descriptions)
        raw = await _call_gemini(prompt)
        _evict_expired()
        _CACHE[sig] = (raw, time.monotonic())
        return _to_inferred(raw)
    except Exception as e:
        _logger.warning("infer_schema_with_ai failed: %s", e)
        return {}


def clear_cache() -> None:
    """Clear the in-process cache (for testing)."""
    _CACHE.clear()
