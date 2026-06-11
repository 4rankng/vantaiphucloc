"""Shared error translation — maps domain exceptions to HTTPException."""

from __future__ import annotations

from typing import Union

from fastapi import HTTPException

# A mapping entry is either:
#   - an int  → status code, detail comes from str(exc)
#   - a tuple (int, str) → status code and fixed detail string
_MappingEntry = Union[int, tuple[int, str]]

# Common built-in mappings applied to every context
_DEFAULT_MAPPINGS: dict[type, _MappingEntry] = {
    PermissionError: 403,
    ValueError: 422,
}


def translate(
    exc: Exception,
    *,
    extra_mappings: dict[type, _MappingEntry] | None = None,
) -> HTTPException:
    """Translate *exc* into an ``HTTPException``.

    Resolution order:
    1. *extra_mappings* (context-specific overrides, checked first)
    2. Built-in defaults (``PermissionError`` → 403, ``ValueError`` → 422)
    3. Fallback → 500

    Each mapping entry is either an ``int`` (status code; detail = ``str(exc)``)
    or a ``(int, str)`` tuple (status code and fixed detail).
    """
    for exc_type, entry in {
        **_DEFAULT_MAPPINGS,
        **(extra_mappings or {}),
    }.items():
        if isinstance(exc, exc_type):
            if isinstance(entry, int):
                return HTTPException(status_code=entry, detail=str(exc))
            status_code, detail = entry
            return HTTPException(status_code=status_code, detail=detail)

    return HTTPException(status_code=500, detail=str(exc))
