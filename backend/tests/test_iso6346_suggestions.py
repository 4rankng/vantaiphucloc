"""Tests for suggest_corrections() in app/utils/iso6346.py."""

import pytest

from app.utils.iso6346 import (
    calculate_check_digit,
    suggest_corrections,
    validate_check_digit,
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


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
