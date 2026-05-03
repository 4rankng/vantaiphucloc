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
# Note: C=11 is skipped in ISO 6346
LETTER_MAP = {
    "A": 10, "B": 12, "C": 13, "D": 14, "E": 15, "F": 16, "G": 17, "H": 18, "I": 19,
    "J": 20, "K": 21, "L": 23, "M": 24, "N": 25, "O": 26, "P": 27, "Q": 28, "R": 29,
    "S": 30, "T": 31, "U": 32, "V": 34, "W": 35, "X": 36, "Y": 37, "Z": 38,
}

# Powers of 2 for each position (0-9 for 10 characters)
POWERS_2 = [2**i for i in range(10)]


def normalize_container_number(container_number: str) -> str:
    """Remove hyphens and convert to uppercase.

    Args:
        container_number: Container number (may include hyphens)

    Returns:
        Normalized container number (uppercase, no hyphens)
    """
    return container_number.replace("-", "").upper().strip()


def validate_format(container_number: str) -> bool:
    """Validate that the container number matches the format XXXX-NNNNNN-N.

    Args:
        container_number: Container number to validate

    Returns:
        True if format is valid, False otherwise
    """
    normalized = normalize_container_number(container_number)

    # Check length (11 characters: 4 letters + 6 digits + 1 check digit)
    if len(normalized) != 11:
        return False

    # Check first 4 are letters
    if not normalized[:4].isalpha():
        return False

    # Check next 6 are digits
    if not normalized[4:10].isdigit():
        return False

    # Check last is digit
    if not normalized[10].isdigit():
        return False

    return True


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
        raise ValueError(f"Container number must be 10 characters (without check digit): {container_number}")

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
        return False, "Sai định dạng. Đúng: XXXXNNNNNNN (4 chữ cái + 7 số, vd: MSKU1234567)"

    # Check check digit
    if not validate_check_digit(normalized):
        return False, "Số container sai, xin kiểm tra lại"

    return True, ""


def get_container_number_error(container_number: str) -> str | None:
    """Get validation error message for a container number.

    Args:
        container_number: Container number to validate

    Returns:
        Error message if invalid, None if valid
    """
    is_valid, error_message = validate_container_number(container_number)
    return None if is_valid else error_message
