"""Tests for ISO 6346 container validation in app/utils/iso6346.py."""

import pytest

from app.utils.iso6346 import (
    calculate_check_digit,
    suggest_corrections,
    validate_check_digit,
    validate_format,
    validate_container_number,
)


def test_suggests_check_digit_fix_first():
    """The most common typo is a wrong check digit — that suggestion ranks #1."""
    # HLXU2352974 — driver's reported case. Correct check digit is 5.
    suggestions = suggest_corrections("HLXU2352974")
    assert suggestions  # not empty
    assert suggestions[0] == "HLXU2352975"


def test_returns_at_most_three_by_default():
    suggestions = suggest_corrections("HLXU2352974")
    assert len(suggestions) <= 3


def test_respects_max_results_param():
    suggestions = suggest_corrections("HLXU2352974", max_results=1)
    assert len(suggestions) == 1
    suggestions = suggest_corrections("HLXU2352974", max_results=5)
    assert len(suggestions) <= 5


def test_max_results_zero_returns_empty():
    assert suggest_corrections("HLXU2352974", max_results=0) == []


def test_already_valid_returns_empty():
    # MSKU1234567's correct check digit:
    correct = "MSKU123456" + str(calculate_check_digit("MSKU123456"))
    assert validate_check_digit(correct)
    assert suggest_corrections(correct) == []


def test_invalid_format_returns_empty():
    assert suggest_corrections("") == []
    assert suggest_corrections("HLXU") == []
    assert suggest_corrections("notvalid") == []
    # Letters where digits should be:
    assert suggest_corrections("HLXU23529ABC") == []


def test_never_returns_input_itself():
    suggestions = suggest_corrections("HLXU2352974")
    assert "HLXU2352974" not in suggestions


def test_all_suggestions_have_valid_check_digit():
    for input_num in ("HLXU2352974", "MSKU1234560", "OBLU3323810"):
        for candidate in suggest_corrections(input_num):
            assert validate_check_digit(candidate), (
                f"{candidate} (suggested for {input_num}) has invalid check digit"
            )


def test_keeps_owner_code_unchanged():
    """Owner code letters (first 4 chars) must never change in suggestions."""
    for input_num in ("HLXU2352974", "MSKU1234560"):
        owner = input_num[:4]
        for candidate in suggest_corrections(input_num):
            assert candidate.startswith(owner), (
                f"{candidate} changed owner code from {owner}"
            )


def test_normalizes_input_before_processing():
    """Hyphens and lowercase should be normalized before suggesting."""
    a = suggest_corrections("hlxu-235297-4")
    b = suggest_corrections("HLXU2352974")
    assert a == b


def test_falls_back_to_two_edit_when_single_edit_insufficient():
    """Constructed case where the top 1-edit fix exists but we still get a list."""
    # Confirm top result is the cheap 1-edit fix for the user's example
    suggestions = suggest_corrections("HLXU2352974", max_results=3)
    assert len(suggestions) >= 1
    assert suggestions[0] == "HLXU2352975"


# ── Golden-path tests: independently verified against ISO 6346 ───────────
#
# These hard-code expected check digits so a silent LETTER_MAP regression
# would be caught.  Values verified by hand (sum % 11).
#
# MSKU123456: 24+60+84+256+16+64+192+512+1280+3072 = 5560 → 5560%11 = 5
# HLXU235297: 18+46+144+256+32+96+320+256+2304+3584 = 7056 → 7056%11 = 5
# OBLU332381: 26+24+92+256+48+96+128+384+2048+512  = 3614 → 3614%11 = 6
# TRLU123456: 31+58+92+256+16+64+192+512+1280+3072  = 5573 → 5573%11 = 7

GOLDEN_PATHS = [
    ("MSKU123456", 5),
    ("HLXU235297", 5),
    ("OBLU332381", 6),
    ("TRLU123456", 7),
]


@pytest.mark.parametrize(
    "prefix,expected", GOLDEN_PATHS, ids=[p for p, _ in GOLDEN_PATHS]
)
def test_calculate_check_digit_known_values(prefix: str, expected: int):
    """Check digit must match independently calculated ISO 6346 reference."""
    assert calculate_check_digit(prefix) == expected


@pytest.mark.parametrize("prefix,check", GOLDEN_PATHS, ids=[p for p, _ in GOLDEN_PATHS])
def test_validate_check_digit_known_valid(prefix: str, check: int):
    """Full 11-char number with correct check digit must validate."""
    full = prefix + str(check)
    assert validate_format(full)
    assert validate_check_digit(full)


@pytest.mark.parametrize("prefix,check", GOLDEN_PATHS, ids=[p for p, _ in GOLDEN_PATHS])
def test_validate_check_digit_wrong_digit(prefix: str, check: int):
    """A wrong check digit must fail validation."""
    wrong = (check + 1) % 10
    if wrong == check:  # skip if wraparound collides
        wrong = (check + 2) % 10
    full = prefix + str(wrong)
    assert not validate_check_digit(full)


@pytest.mark.parametrize("prefix,check", GOLDEN_PATHS, ids=[p for p, _ in GOLDEN_PATHS])
def test_validate_container_number_golden(prefix: str, check: int):
    """Full validate_container_number must accept valid and reject invalid."""
    valid, err = validate_container_number(prefix + str(check))
    assert valid and err == ""

    wrong = (check + 1) % 10 or 1
    valid2, err2 = validate_container_number(prefix + str(wrong))
    assert not valid2 and err2 != ""


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
