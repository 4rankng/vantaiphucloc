"""Fuzzy string matching utilities for reconciliation."""

import unicodedata


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


def levenshtein_distance(s1: str, s2: str) -> int:
    """Compute Levenshtein edit distance between two strings."""
    if len(s1) < len(s2):
        return levenshtein_distance(s2, s1)
    if len(s2) == 0:
        return len(s1)

    prev_row = list(range(len(s2) + 1))
    for i, c1 in enumerate(s1):
        curr_row = [i + 1]
        for j, c2 in enumerate(s2):
            insertions = prev_row[j + 1] + 1
            deletions = curr_row[j] + 1
            substitutions = prev_row[j] + (c1 != c2)
            curr_row.append(min(insertions, deletions, substitutions))
        prev_row = curr_row
    return prev_row[-1]


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
