"""Fuzzy string matching utilities for reconciliation."""

from __future__ import annotations

from typing import TypeVar

import unicodedata
from Levenshtein import distance as levenshtein_distance, ratio as _lev_ratio

T = TypeVar("T")


def remove_diacritics(text: str) -> str:
    """Remove Vietnamese diacritics from text.

    Normalizes to NFD, strips combining marks, replaces đ/Đ.
    Returns lowercase result.
    """
    normalized = unicodedata.normalize("NFD", text)
    without_diacritics = "".join(
        ch for ch in normalized if unicodedata.category(ch) != "Mn"
    )
    without_diacritics = without_diacritics.replace("đ", "d").replace("Đ", "D")
    return without_diacritics.lower().strip()


def fuzzy_ratio(a: str, b: str) -> float:
    """Return similarity ratio (0.0 – 1.0) using Levenshtein package.

    Both strings are normalised (diacritics stripped, lowercased) first.
    """
    na = remove_diacritics(a)
    nb = remove_diacritics(b)
    if not na or not nb:
        return 0.0
    return _lev_ratio(na, nb)


def fuzzy_match_name(
    raw: str,
    candidates: dict[str, T],
    threshold: float = 0.85,
) -> T | None:
    """Find the best fuzzy match for *raw* among *candidates* keys.

    Keys are expected to be normalised (lowered, diacritics-stripped).
    Returns the value of the best match if its ratio >= *threshold*, else None.
    """
    if not raw or not candidates:
        return None
    norm = remove_diacritics(raw)
    best: T | None = None
    best_score = 0.0
    for key, val in candidates.items():
        score = _lev_ratio(norm, key)
        if score > best_score:
            best_score = score
            best = val
    return best if best_score >= threshold else None


def fuzzy_match(
    a: str,
    b: str,
    threshold: int = 2,
) -> tuple[bool, bool]:
    """Compare two strings with fuzzy tolerance.

    Args:
        a: First string
        b: Second string
        threshold: Maximum Levenshtein distance for fuzzy match (default 2)

    Returns:
        (is_match, is_fuzzy):
            is_match = True if exact or fuzzy match
            is_fuzzy = True if matched via fuzzy (not exact)
    """
    if not a or not b:
        return False, False

    # Normalize: remove diacritics, lowercase, strip whitespace
    na = remove_diacritics(a)
    nb = remove_diacritics(b)

    # Exact match after normalization
    if na == nb:
        return True, False

    # Fuzzy match via Levenshtein distance
    dist = levenshtein_distance(na, nb)
    if dist <= threshold:
        return True, True

    return False, False


def fuzzy_match_container(
    container_a: str,
    container_b: str,
    threshold: int = 1,
) -> tuple[bool, bool]:
    """Fuzzy match container numbers specifically.

    Container numbers have check digits, so threshold defaults to 1
    (a 1-char typo could create a real-but-wrong container reference).

    Both inputs should already be normalized (uppercase, no spaces).
    """
    if not container_a or not container_b:
        return False, False

    ca = container_a.upper().strip()
    cb = container_b.upper().strip()

    if ca == cb:
        return True, False

    dist = levenshtein_distance(ca, cb)
    if dist <= threshold:
        return True, True

    return False, False


def container_edit_distance(container_a: str, container_b: str) -> int | None:
    """Return edit distance between two container numbers.

    Returns None if either input is empty.
    Both inputs should already be normalized (uppercase, no spaces).
    """
    if not container_a or not container_b:
        return None

    ca = container_a.upper().strip()
    cb = container_b.upper().strip()

    if ca == cb:
        return 0

    return levenshtein_distance(ca, cb)
