"""Layer 4 — value normalization for canonical fields.

Each parser returns either the typed value or raises `ValueError`. Higher
layers turn the exception into a per-row rejection reason.
"""

from __future__ import annotations

import math
import re
from datetime import date, datetime, timedelta
from typing import Any

from app.utils.iso6346 import normalize_container_number


CONTAINER_NO_RE = re.compile(r"^[A-Z]{4}\d{7}$")
PLATE_RE = re.compile(r"\s+")


# ---------------------------------------------------------------------------
# Container number / size / freight kind
# ---------------------------------------------------------------------------

def parse_container_no(raw: Any) -> str:
    """Normalize and shape-validate a container number.

    Rejects '#REF!', 'Please input data !', '0', etc. We do NOT enforce the
    ISO 6346 check digit because real customer files often contain
    typo-broken numbers and we still want the row rather than killing it.
    """
    if raw is None:
        raise ValueError("missing_container_no")
    s = str(raw).strip()
    if not s or s.startswith("#"):
        raise ValueError("missing_container_no")
    norm = normalize_container_number(s)
    if not CONTAINER_NO_RE.match(norm):
        raise ValueError("bad_container_no")
    return norm


_SIZE_LEAD_RE = re.compile(r"^(\d{2})")
_SIZE_TOKEN_RE = re.compile(r"(?<![\d])(\d{2})(?![\d])")


def parse_container_size(raw: Any, iso_hint: str | None = None) -> str:
    """Return '20' or '40'.

    Accepts numerics (20, 40, 45), size+type tokens (20DC, 40HC, 22G0,
    45G1, 42U0), and free-text "Cont 40" / "20 ft GP". Tries the start-
    of-string pattern first since ISO codes always lead with the size
    digits, then falls back to a digit-bounded scan.
    """
    sources = [raw, iso_hint]
    for src in sources:
        if src is None:
            continue
        s = str(src).strip().upper()
        if not s:
            continue
        if s in ("20", "40"):
            return s
        if s == "45":
            return "40"
        m = _SIZE_LEAD_RE.match(s) or _SIZE_TOKEN_RE.search(s)
        if m:
            n = int(m.group(1))
            if n in (20, 22):
                return "20"
            if n in (40, 42, 45):
                return "40"
    raise ValueError("unknown_size")


def parse_freight_kind(raw: Any, default: str = "F", raise_on_unknown: bool = False) -> str:
    """Return 'F' or 'E'. 
    
    If raise_on_unknown is True, raises ValueError for empty/unknown freight kind instead of using default.
    This allows the import pipeline to detect rows that need manual resolution.
    """
    if raw is None or (isinstance(raw, str) and not raw.strip()):
        if raise_on_unknown:
            raise ValueError("unknown_freight_kind")
        return default
    s = str(raw).strip().upper()
    if s.startswith("F") or s in ("FULL", "1", "Y", "YES", "HÀNG", "HANG"):
        return "F"
    if s.startswith("E") or s in ("EMPTY", "0", "N", "NO", "RỖNG", "RONG", "VỎ", "VO"):
        return "E"
    if raise_on_unknown:
        raise ValueError("unknown_freight_kind")
    raise ValueError("unknown_freight_kind")


# ---------------------------------------------------------------------------
# Numbers / weights
# ---------------------------------------------------------------------------

_NUM_KEEP_RE = re.compile(r"[\d.,\-]")


def parse_weight_kg(raw: Any) -> float | None:
    if raw is None or raw == "":
        return None
    if isinstance(raw, (int, float)):
        if isinstance(raw, float) and math.isnan(raw):
            return None
        f = float(raw)
        # Some files write tonnes (e.g. 15.66 instead of 15660). If the
        # value is < 100 we assume tonnes and multiply by 1000. Anything
        # ≥ 100 is treated as kg directly.
        return f * 1000 if f < 100 else f
    s = str(raw).strip()
    if not s:
        return None
    cleaned = "".join(ch for ch in s if _NUM_KEEP_RE.match(ch))
    if not cleaned:
        return None
    # Decimal separator detection: if both ',' and '.' present the LAST
    # one is the decimal. If only one is present and there are exactly 3
    # digits after it, it's a thousands separator.
    last_dot = cleaned.rfind(".")
    last_comma = cleaned.rfind(",")
    if last_dot > -1 and last_comma > -1:
        if last_dot > last_comma:
            cleaned = cleaned.replace(",", "")
        else:
            cleaned = cleaned.replace(".", "").replace(",", ".")
    elif last_comma > -1:
        # Only commas — try as decimal first, fall back to thousands sep
        if len(cleaned) - last_comma - 1 == 3 and cleaned.count(",") >= 1:
            cleaned = cleaned.replace(",", "")
        else:
            cleaned = cleaned.replace(",", ".")
    try:
        f = float(cleaned)
    except ValueError:
        return None
    if not math.isfinite(f) or f < 0:
        return None
    return f * 1000 if f < 100 else f


_MONEY_CLEAN_RE = re.compile(r"[^\d.,\-]")


def parse_money(raw: Any) -> float | None:
    """Parse a currency/charge value handling Vietnamese comma/dot conventions.

    Handles: "1,500,000" -> 1500000, "1,5" -> 1.5,
    "1.234,56" -> 1234.56, "1,234.56" -> 1234.56.
    Returns None for empty / unparseable input.
    """
    if raw is None or (isinstance(raw, str) and not raw.strip()):
        return None
    cleaned = _MONEY_CLEAN_RE.sub("", str(raw))
    if not cleaned:
        return None
    # Decimal separator detection — mirrors parse_weight_kg logic
    last_dot = cleaned.rfind(".")
    last_comma = cleaned.rfind(",")
    if last_dot > -1 and last_comma > -1:
        if last_dot > last_comma:
            cleaned = cleaned.replace(",", "")
        else:
            cleaned = cleaned.replace(".", "").replace(",", ".")
    elif last_comma > -1:
        # Only commas — treat as decimal unless exactly 3 trailing digits
        # (thousands separator, e.g. "1,500,000")
        if len(cleaned) - last_comma - 1 == 3 and cleaned.count(",") >= 1:
            cleaned = cleaned.replace(",", "")
        else:
            cleaned = cleaned.replace(",", ".")
    try:
        return float(cleaned) if cleaned else None
    except ValueError:
        return None


# ---------------------------------------------------------------------------
# Dates
# ---------------------------------------------------------------------------

_DATE_FORMATS_DMY = (
    "%d/%m/%Y", "%d-%m-%Y", "%d.%m.%Y",
    "%d/%m/%y", "%d-%m-%y", "%d.%m.%y",
    "%d/%m/%Y %H:%M:%S", "%d-%m-%Y %H:%M:%S", "%d.%m.%Y %H:%M:%S",
    "%d/%m/%Y %H:%M", "%d-%m-%Y %H:%M",
)
_DATE_FORMATS_YMD = (
    "%Y-%m-%d", "%Y/%m/%d",
    "%Y-%m-%d %H:%M:%S", "%Y/%m/%d %H:%M:%S",
    "%Y-%m-%dT%H:%M:%S",
)
_EXCEL_EPOCH = datetime(1899, 12, 30)


def parse_date(raw: Any) -> date | None:
    if raw is None or raw == "":
        return None
    if isinstance(raw, datetime):
        return raw.date()
    if isinstance(raw, date):
        return raw
    if isinstance(raw, (int, float)):
        # Excel serial date (days since 1899-12-30, with 1900 leap-year quirk).
        try:
            return (_EXCEL_EPOCH + timedelta(days=float(raw))).date()
        except (OverflowError, ValueError):
            return None
    s = str(raw).strip()
    if not s:
        return None
    # Strip ISO suffix microseconds that strptime can't handle without %f
    s = re.sub(r"\.\d+$", "", s)
    for fmt in _DATE_FORMATS_DMY + _DATE_FORMATS_YMD:
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            continue
    return None


# ---------------------------------------------------------------------------
# Strings (locations / refs / remarks)
# ---------------------------------------------------------------------------

_PLATE_NORM_RE = re.compile(r"\s+")
_TRIM_PUNCT_RE = re.compile(r"^[\s.,;:\-_/\\]+|[\s.,;:\-_/\\]+$")


def parse_string(raw: Any, max_len: int = 500) -> str:
    if raw is None:
        return ""
    s = str(raw).strip()
    s = _TRIM_PUNCT_RE.sub("", s)
    s = _PLATE_NORM_RE.sub(" ", s)
    return s[:max_len]


def parse_plate(raw: Any) -> str:
    s = parse_string(raw, max_len=20).upper().replace(" ", "")
    return s


# ---------------------------------------------------------------------------
# Combined size+type parsing (e.g. "40HC", "20DC", "20RF")
# ---------------------------------------------------------------------------

_SIZE_TYPE_RE = re.compile(r"^(\d{2})\s*(.*)$")


def parse_size_type(raw: Any) -> tuple[str | None, str | None]:
    """Parse combined size+type like '40HC', '20DC'.

    Returns (size, type_code). Either may be None.
    """
    if raw is None:
        return None, None
    s = str(raw).strip()
    if not s or s.lower() == "nan":
        return None, None
    m = _SIZE_TYPE_RE.match(s)
    if m:
        return m.group(1), m.group(2) or None
    if s.isdigit():
        return s, None
    return None, s


def build_cont_type(freight_kind: Any, size: Any, type_code: str | None = None) -> str:
    """Build work_type string: E20, E40, F20, F40.

    Normalizes freight_kind and size, returns the combined code.
    """
    # Normalize F/E
    fe = "E"
    if freight_kind is not None:
        fk = str(freight_kind).strip().upper()
        if fk in ("F", "FULL", "H", "HÀNG", "HANG", "1", "Y"):
            fe = "F"
        elif fk in ("E", "EMPTY", "R", "RỖNG", "RONG", "VỎ", "VO", "0", "N"):
            fe = "E"

    # Normalize size (only 20 or 40 are valid)
    sz = str(size).strip() if size else "20"
    m = re.match(r"^(\d+)", sz)
    sz = m.group(1) if m else "20"
    if sz not in ("20", "40"):
        sz = "20"

    return f"{fe}{sz}"
