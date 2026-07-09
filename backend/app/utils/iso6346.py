"""ISO 6346 container number validation.

ISO 6346 defines the format and check digit calculation for container numbers.
Format: XXXX-NNNNNN-N
  - XXXX: 4 letters (owner code)
  - -: separator (optional)
  - NNNNNN: 6 digits (serial number)
  - -: separator (optional)
  - N: 1 digit (check digit)

Check digit calculation:
1. Letters are mapped to numbers (A=10, B=12, C=13, ..., Z=38)
2. Each position is multiplied by 2^position (0-indexed from left)
3. Sum of products is calculated
4. Check digit = sum % 11, except if result is 10 then it's 0
"""

import logging
import re

_logger = logging.getLogger(__name__)

# Letter to number mapping (A=10, B=12, ..., Z=38)
# Values skip multiples of 11 (11, 22, 33) to avoid zero remainders in mod 11
LETTER_MAP = {
    "A": 10,
    "B": 12,
    "C": 13,
    "D": 14,
    "E": 15,
    "F": 16,
    "G": 17,
    "H": 18,
    "I": 19,
    "J": 20,
    "K": 21,
    "L": 23,
    "M": 24,
    "N": 25,
    "O": 26,
    "P": 27,
    "Q": 28,
    "R": 29,
    "S": 30,
    "T": 31,
    "U": 32,
    "V": 34,
    "W": 35,
    "X": 36,
    "Y": 37,
    "Z": 38,
}

# Powers of 2 for each position (0-9 for 10 characters)
POWERS_2 = [2**i for i in range(10)]
SPECIAL_CONTAINER_RE = re.compile(r"^[A-Z]{4}\d{4}$")


def normalize_container_number(container_number: str) -> str:
    """Remove separators and convert to uppercase.

    Args:
        container_number: Container number (may include spaces or hyphens)

    Returns:
        Normalized container number (uppercase, no spaces or hyphens)
    """
    return re.sub(r"[-\s]+", "", container_number).upper().strip()


def validate_format(container_number: str) -> bool:
    """Validate that the container number matches the format XXXXNNNNNNN (4 letters + 7 digits)."""
    normalized = normalize_container_number(container_number)
    return (
        len(normalized) == 11 and normalized[:4].isalpha() and normalized[4:].isdigit()
    )


def validate_special_container_format(container_number: str) -> bool:
    """Validate non-ISO short container identifiers such as HCWT0006."""
    normalized = normalize_container_number(container_number)
    return bool(SPECIAL_CONTAINER_RE.fullmatch(normalized))


def calculate_check_digit(container_number: str) -> int:
    """Calculate the check digit for a container number.

    Args:
        container_number: Container number (without check digit, 10 characters)

    Returns:
        Check digit (0-10, where 10 is represented as 0)

    Raises:
        ValueError: If container number is invalid format
    """
    normalized = normalize_container_number(container_number)

    if len(normalized) != 10:
        raise ValueError(
            f"Container number must be 10 characters (without check digit): {container_number}"
        )

    # Calculate sum
    total = 0
    for i, char in enumerate(normalized):
        if i < 4:
            # Letters: map to number
            if char not in LETTER_MAP:
                raise ValueError(f"Invalid letter in container number: {char}")
            value = LETTER_MAP[char]
        else:
            # Digits: use numeric value
            if not char.isdigit():
                raise ValueError(f"Invalid digit in container number: {char}")
            value = int(char)

        total += value * POWERS_2[i]

    # Check digit is sum % 11, but if result is 10 then it's 0
    check_digit = total % 11
    if check_digit == 10:
        check_digit = 0

    return check_digit


def validate_check_digit(container_number: str) -> bool:
    """Validate that the container number's check digit is correct.

    Args:
        container_number: Container number with check digit (11 characters)

    Returns:
        True if check digit is valid, False otherwise
    """
    normalized = normalize_container_number(container_number)

    if len(normalized) != 11:
        return False

    # Extract the provided check digit
    provided_check = int(normalized[10])

    # Calculate expected check digit
    try:
        expected_check = calculate_check_digit(normalized[:10])
    except ValueError:
        return False

    return provided_check == expected_check


def validate_container_number(container_number: str) -> tuple[bool, str]:
    """Fully validate a container number against ISO 6346.

    Args:
        container_number: Container number to validate

    Returns:
        Tuple of (is_valid, error_message)
        - If valid: (True, "")
        - If invalid: (False, error_message)
    """
    if not container_number:
        return False, "Vui lòng nhập số container"

    normalized = normalize_container_number(container_number)

    # Check format
    if not validate_format(normalized):
        return (
            False,
            "Sai định dạng. Đúng: XXXXNNNNNNN (4 chữ cái + 7 số, vd: MSKU1234567)",
        )

    # Check check digit
    if not validate_check_digit(normalized):
        return False, "Sai số kiểm tra — định dạng đúng nhưng mã kiểm tra không khớp"

    return True, ""


def validate_container_identifier(container_number: str) -> tuple[bool, str]:
    """Validate either an ISO 6346 number or a short special container code."""
    if not container_number:
        return False, "Vui lòng nhập số container"

    normalized = normalize_container_number(container_number)

    if validate_format(normalized):
        return validate_container_number(normalized)

    if SPECIAL_CONTAINER_RE.fullmatch(normalized):
        return True, ""

    return (
        False,
        "Sai định dạng. Nhập mã ISO 4 chữ + 7 số hoặc mã đặc biệt như HCWT0006",
    )


def suggest_corrections(container_number: str, max_results: int = 3) -> list[str]:
    """Suggest valid container numbers within 1-2 digit edits of ``container_number``.

    Use case: driver enters/scans a container number whose ISO 6346 check digit
    doesn't match. Most of the time this is a single-digit typo or OCR misread
    in the 7-digit numeric portion. This function enumerates candidate numbers
    that:

    1. Keep the 4-letter owner code unchanged (owner code is usually correct
       and changing it would change the container's identity entirely).
    2. Differ from the input in 1 or 2 digit positions (positions 4..10, which
       includes the check digit).
    3. Have a valid ISO 6346 check digit.

    Ranking (best first):
      * Fewer edits beat more edits (1-edit before 2-edit).
      * Within the same edit count, prefer candidates whose edit is just the
        check digit (position 10) — that's the most common reason for failure.
      * Smaller absolute digit deltas next (e.g. 4→5 beats 4→9).

    Args:
        container_number: An 11-char container number that failed validation.
            Must already be in normalized format (no hyphens, uppercase). If
            the format is wrong (not 4 letters + 7 digits), returns [].
        max_results: Maximum number of suggestions to return. Defaults to 3.

    Returns:
        Up to ``max_results`` candidate container numbers, ordered best-first.
        Never includes the input itself. Returns [] if no candidates qualify
        or the input format is unrecoverable.
    """
    if max_results <= 0:
        return []

    normalized = normalize_container_number(container_number)
    if not validate_format(normalized):
        return []

    # If the input is already valid, nothing to suggest.
    if validate_check_digit(normalized):
        return []

    owner = normalized[:4]
    original_digits = normalized[4:11]  # 7 digits: 6 serial + 1 check

    # Score each candidate so we can rank and dedupe.
    # Lower score = better suggestion.
    scored: dict[str, tuple[int, int, int]] = {}

    def consider(candidate_digits: str, edited_positions: tuple[int, ...]) -> None:
        candidate = owner + candidate_digits
        if candidate == normalized:
            return
        if not validate_check_digit(candidate):
            return
        edit_count = len(edited_positions)
        # Bonus for editing the check digit (position 10 in the full number = position 6 in the 7-digit slice).
        check_digit_only = 1 if edited_positions == (6,) else 0
        # Sum of absolute deltas between original and candidate at edited positions.
        delta_sum = sum(
            abs(int(candidate_digits[p]) - int(original_digits[p]))
            for p in edited_positions
        )
        # Score tuple: (edit_count, NOT check_digit_only, delta_sum).
        # Tuple compare gives natural lexicographic ordering.
        score = (edit_count, 1 - check_digit_only, delta_sum)
        existing = scored.get(candidate)
        if existing is None or score < existing:
            scored[candidate] = score

    # ── Pass 1: single-digit substitutions ──────────────────────────────────
    for pos in range(7):
        original = original_digits[pos]
        for new_digit in "0123456789":
            if new_digit == original:
                continue
            candidate_digits = (
                original_digits[:pos] + new_digit + original_digits[pos + 1 :]
            )
            consider(candidate_digits, (pos,))

    # ── Pass 2: two-digit substitutions ─────────────────────────────────────
    # Only run if we don't already have enough single-edit suggestions, to
    # avoid an O(n²·10²) blowup when single-edit candidates already saturate.
    single_edit_count = sum(1 for s in scored.values() if s[0] == 1)
    if single_edit_count < max_results:
        for pos_a in range(7):
            for pos_b in range(pos_a + 1, 7):
                orig_a = original_digits[pos_a]
                orig_b = original_digits[pos_b]
                for da in "0123456789":
                    if da == orig_a:
                        continue
                    for db in "0123456789":
                        if db == orig_b:
                            continue
                        candidate_digits = (
                            original_digits[:pos_a]
                            + da
                            + original_digits[pos_a + 1 : pos_b]
                            + db
                            + original_digits[pos_b + 1 :]
                        )
                        consider(candidate_digits, (pos_a, pos_b))

    # Rank by score, then take top N.
    ranked = sorted(scored.items(), key=lambda kv: kv[1])
    return [candidate for candidate, _score in ranked[:max_results]]
