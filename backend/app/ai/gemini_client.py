"""Google Gemini API client for AI parsing.

Uses Gemini API key from pydantic-settings (app.config.settings).
"""

from __future__ import annotations

import json
import logging

import httpx

from app.config import GEMINI_MODELS, settings

_logger = logging.getLogger(__name__)

# API endpoint
GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models"


async def call_gemini(
    prompt: str,
    model: str | None = None,
    max_tokens: int = 2048,
    temperature: float = 0.1,
    response_schema: dict | None = None,
) -> str:
    """Call Gemini API with a text prompt.

    Args:
        prompt: Text prompt
        model: Specific model to use (None = try fallback chain)
        max_tokens: Max output tokens
        temperature: Sampling temperature (low = more deterministic)

    Returns:
        Response text

    Raises:
        RuntimeError: If API key not set or API call fails
    """
    api_key = settings.GEMINI_API_KEY
    if not api_key:
        raise RuntimeError(
            "GEMINI_API_KEY not configured. "
            "Set it in .env or environment. "
            "Get one from https://aistudio.google.com/apikey"
        )

    models_to_try = [model] if model else GEMINI_MODELS
    last_error = None

    for model_name in models_to_try:
        url = f"{GEMINI_API_BASE}/{model_name}:generateContent?key={api_key}"

        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "maxOutputTokens": max_tokens,
                "temperature": temperature,
            },
        }

        if response_schema:
            payload["generationConfig"]["responseMimeType"] = "application/json"
            payload["generationConfig"]["responseSchema"] = response_schema

        try:
            async with httpx.AsyncClient(timeout=30) as client:
                response = await client.post(url, json=payload)
                response.raise_for_status()
                data = response.json()

            return data["candidates"][0]["content"]["parts"][0]["text"]
        except (KeyError, IndexError) as e:
            last_error = f"Unexpected response format: {e}"
            _logger.error("[Gemini] %s: %s", model_name, last_error)
        except Exception as e:
            last_error = f"{type(e).__name__}: {e}"
            _logger.warning("[Gemini] %s failed: %s", model_name, last_error)

    raise RuntimeError(f"All models failed: {last_error}")


async def call_gemini_row_cleanup(
    row_data: dict[str, str],
    issues: list[str],
    model: str | None = None,
) -> dict[str, str]:
    """Stage 4: Clean up a problematic row using LLM.

    Args:
        row_data: Raw cell values for the row
        issues: List of specific issues (e.g., "weird date format", "container has extra chars")
        model: Model name

    Returns:
        Cleaned cell values
    """
    issues_text = "\n".join(f"- {i}" for i in issues)
    cells_text = "\n".join(f"  {k}: {v}" for k, v in row_data.items())

    prompt = f"""Clean up the following data row from a Vietnamese trucking spreadsheet.
The row has these issues:
{issues_text}

Raw data:
{cells_text}

Respond with ONLY a JSON object with the same keys but cleaned values:
- Dates → YYYY-MM-DD format
- Container numbers → uppercase, no spaces (e.g. ABCU1234567)
- Amounts → integer VND, no currency suffix
- Names → trimmed, proper case

Rules:
- If a value cannot be reliably cleaned, return it unchanged
- Do not fabricate or guess missing values"""

    schema = {
        "type": "OBJECT",
        "properties": {k: {"type": "STRING"} for k in row_data.keys()}
    }

    response = await call_gemini(prompt, model=model, max_tokens=512, response_schema=schema)

    try:
        return json.loads(response.strip())
    except (json.JSONDecodeError, ValueError):
        _logger.warning("Row cleanup failed, returning raw data")
        return row_data


# Cost estimation (Gemini 2.5 Flash pricing)
# Input: $0.15/1M tokens, Output: $0.60/1M tokens
def estimate_cost(input_tokens: int, output_tokens: int) -> float:
    """Estimate USD cost for a Gemini API call."""
    return (input_tokens * 0.15 / 1_000_000) + (output_tokens * 0.60 / 1_000_000)
