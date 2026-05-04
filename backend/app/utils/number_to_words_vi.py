"""Convert a non-negative integer to Vietnamese words (đồng).

Used for the "Bằng chữ" line on customer settlement reports.

Example:
    >>> number_to_vietnamese_words(1234567890)
    'Một tỷ hai trăm ba mươi tư triệu năm trăm sáu mươi bảy nghìn tám trăm chín mươi đồng'
"""

_DIGITS = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"]


def _read_three_digits(num: int, full: bool) -> str:
    """Read 0–999 in Vietnamese.

    *full* — when True, leading zeros become "không trăm" / "linh" so the
    block reads correctly inside a larger number (e.g. 1.045.000 → "một
    triệu không trăm bốn mươi lăm nghìn"). For the leading block it's False.
    """
    hundreds, rem = divmod(num, 100)
    tens, units = divmod(rem, 10)
    parts: list[str] = []

    if hundreds > 0:
        parts.append(f"{_DIGITS[hundreds]} trăm")
    elif full and (tens > 0 or units > 0):
        parts.append("không trăm")

    if tens > 1:
        parts.append(f"{_DIGITS[tens]} mươi")
        if units == 1:
            parts.append("mốt")
        elif units == 5:
            parts.append("lăm")
        elif units > 0:
            parts.append(_DIGITS[units])
    elif tens == 1:
        parts.append("mười")
        if units == 5:
            parts.append("lăm")
        elif units > 0:
            parts.append(_DIGITS[units])
    elif units > 0:
        # tens == 0
        if hundreds > 0 or full:
            parts.append("linh")
        parts.append(_DIGITS[units])

    return " ".join(parts)


def number_to_vietnamese_words(amount: int) -> str:
    """Convert *amount* (non-negative integer VND) to Vietnamese words ending in "đồng"."""
    if amount < 0:
        return "Âm " + number_to_vietnamese_words(-amount).lower()
    if amount == 0:
        return "Không đồng"

    # Split into groups of 3 digits from the right.
    groups: list[int] = []
    n = amount
    while n > 0:
        groups.append(n % 1000)
        n //= 1000

    # Group labels from least-significant: '', nghìn, triệu, tỷ, nghìn tỷ, triệu tỷ ...
    base_labels = ["", "nghìn", "triệu", "tỷ"]
    parts: list[str] = []
    for i in range(len(groups) - 1, -1, -1):
        block = groups[i]
        if block == 0:
            continue
        is_leading = (i == len(groups) - 1)
        block_text = _read_three_digits(block, full=not is_leading)
        # Pick label. Beyond i=3 we cycle through "tỷ" multiples. For VND
        # bills we never exceed ~ 12 digits, so a defensive fallback only.
        if i < len(base_labels):
            label = base_labels[i]
        else:
            extra = i - 3
            label = ("nghìn ", "triệu ", "tỷ ")[extra % 3] + "tỷ" * (extra // 3 + 1)
            label = label.strip()
        if label:
            block_text = f"{block_text} {label}"
        parts.append(block_text)

    text = " ".join(parts).strip()
    text = text[0].upper() + text[1:] if text else text
    return f"{text} đồng"
