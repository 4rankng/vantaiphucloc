"""Canonical import schema + synonym dictionary.

The set of fields the import pipeline knows how to populate. **No vessel
info.** The dictionary is intentionally generic and language-aware (English
+ Vietnamese, with a couple of neighbouring-language entries we've
encountered in real customer files).

Adding a synonym at runtime is supported via the customer-template cache
(see `app/services/import_pipeline/templates.py`); editing this file is
only needed for global, all-customer additions.
"""

from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass


@dataclass(frozen=True)
class CanonicalField:
    name: str
    label: str          # Vietnamese-facing UI label
    required: bool
    description: str    # one-line tooltip


# Single source of truth — the preview UI iterates this to render the
# mapping table.
CANONICAL_FIELDS: tuple[CanonicalField, ...] = (
    CanonicalField("container_no",        "Số container",          True,  "ISO 6346 (4 chữ + 7 số)."),
    CanonicalField("container_size",      "Kích thước",            True,  "20 hoặc 40."),
    CanonicalField("freight_kind",        "Loại hàng (F/E)",       True,  "F = có hàng, E = vỏ rỗng."),
    CanonicalField("container_type_iso",  "Mã ISO",                False, "Ví dụ: 22G0, 45G1."),
    CanonicalField("gross_weight_kg",     "Trọng lượng (kg)",      False, "VGM hoặc gross weight."),
    CanonicalField("seal_no",             "Số seal",               False, "Số niêm phong chì."),
    CanonicalField("pickup_location",     "Điểm đi",               False, "Yard/khách hàng nguồn."),
    CanonicalField("dropoff_location",    "Điểm đến",              False, "Yard/khách hàng đích."),
    CanonicalField("pickup_date",         "Ngày đi",               False, ""),
    CanonicalField("dropoff_date",        "Ngày đến",              False, ""),
    CanonicalField("trip_date",           "Ngày chuyến",           False, "Khi không có ngày đi/đến riêng."),
    CanonicalField("customer_ref",        "Số booking / B/L",      False, "Hoặc số work order, dùng để tra trùng."),
    CanonicalField("consignee",           "Khách hàng / chủ hàng", False, ""),
    CanonicalField("commodity",           "Mặt hàng",              False, ""),
    CanonicalField("driver_name",         "Tài xế",                False, ""),
    CanonicalField("tractor_plate",       "Biển số xe",            False, ""),
    CanonicalField("remarks",             "Ghi chú",               False, ""),
)

CANONICAL_FIELD_NAMES: frozenset[str] = frozenset(f.name for f in CANONICAL_FIELDS)

# Special value used by the column mapper to mark "skip this column on
# purpose" (vessel/voyage/admin clutter). The frontend renders this row
# under "Bỏ qua" (skipped).
SKIP_FIELD = "__skip__"


# ---------------------------------------------------------------------------
# Header text normalization (used both for synonym lookup and for hashing
# the structure of a sheet so we can cache mappings per customer).
# ---------------------------------------------------------------------------

_WS_RE = re.compile(r"\s+", flags=re.UNICODE)


def normalize_header_text(text: str | None) -> str:
    """Lowercased, accent-folded, whitespace-collapsed, trimmed."""
    if text is None:
        return ""
    if not isinstance(text, str):
        text = str(text)
    # NFD strips combining marks, so "đ" stays "đ" but "à" → "a"
    folded = unicodedata.normalize("NFD", text)
    folded = "".join(ch for ch in folded if not unicodedata.combining(ch))
    folded = folded.replace("đ", "d").replace("Đ", "d")
    folded = folded.lower()
    folded = _WS_RE.sub(" ", folded).strip()
    # Collapse common punctuation that varies across files
    folded = folded.replace(".", "").replace(":", "").replace("\n", " ").replace("\r", " ")
    folded = _WS_RE.sub(" ", folded).strip()
    return folded


# ---------------------------------------------------------------------------
# Synonyms.
#
# Keys are canonical field names. Each value is a list of header strings —
# **already normalized** (use `normalize_header_text`-equivalent text). At
# load time we also normalize them again for safety.
# ---------------------------------------------------------------------------

SYNONYMS: dict[str, list[str]] = {
    "container_no": [
        "container", "container no", "container number", "cont", "contno",
        "contno.", "cont no", "container id", "ctr no", "ctnr", "container#",
        "so container", "số container", "so cont", "số cont",
        "ma cont", "mã cont", "ma container", "mã container",
        "หมายเลขตู้",  # Thai (Glory Shanghai files)
    ],
    "container_size": [
        "size", "sz", "kich thuoc", "kích thước", "kich co", "kích cỡ",
        "container size",
    ],
    "container_type_iso": [
        "iso", "iso size", "iso code", "kich co iso", "kích cỡ iso",
        "loai hop", "loại hộp", "loai cont", "loại cont", "loại", "loai",
        "type", "container type",
    ],
    "freight_kind": [
        "f/e", "fe", "f e", "freight kind", "full/empty", "full empty",
        "rong/hang", "rỗng/hàng", "hang/rong", "hàng/rỗng",
        "rong hang", "rỗng hàng", "hang rong", "hàng rỗng",
        "rong", "rỗng", "hang", "hàng",
        "f", "e", "full", "empty",
    ],
    "gross_weight_kg": [
        "weight", "vgm", "vgm (kgm)", "gross weight", "gross weight (kg)",
        "trong luong", "trọng lượng", "kg", "kgm", "weight kg",
        "tổng trọng lượng", "tong trong luong",
    ],
    "seal_no": [
        "seal", "seal no", "seal number", "sealno", "sealno.", "seal no.",
        "so niem phong", "số niêm phong", "so niem phong chi", "số niêm phong chì",
        "so seal", "số seal", "niem phong", "niêm phong",
    ],
    "pickup_location": [
        "pickup", "pick up", "pickup location", "from", "origin",
        "diem di", "điểm đi", "diem lay", "điểm lấy",
        "noi lay", "nơi lấy", "lay", "lấy",
        "from terminal", "origin terminal",
        "cy",                     # CY = Container Yard (acts as origin in loading lists)
        "so san", "số sân",       # yard #
    ],
    "dropoff_location": [
        "dropoff", "drop off", "to", "destination",
        "diem den", "điểm đến", "diem tra", "điểm trả",
        "noi tra", "nơi trả", "tra", "trả",
        "to terminal", "destination terminal",
        "del port",               # delivery port (used as destination, not vessel POD)
        "delivery", "delivery location",
        "hop di dau", "hộp đi đâu",
    ],
    "pickup_date": [
        "pickup date", "from date", "ngay lay", "ngày lấy",
        "loading date", "ngay di", "ngày đi",
    ],
    "dropoff_date": [
        "dropoff date", "to date", "delivery date",
        "ngay tra", "ngày trả", "ngay den", "ngày đến",
        "discharge date", "ngay xuat tau", "ngày xuất tàu",
    ],
    "trip_date": [
        "date", "trip date", "ngay", "ngày", "ngay chay", "ngày chạy",
        "thoi gian", "thời gian", "thoi gian xuat hien", "thời gian xuất hiện",
        "thoi gian tiep can xe", "thời gian tiếp cận xe",
    ],
    "customer_ref": [
        "booking", "booking no", "booking number", "ref", "reference",
        "bl", "b/l", "bill of lading",
        "so van don", "số vận đơn", "so booking", "số booking",
        "wo", "work order", "ma don hang", "mã đơn hàng",
    ],
    "consignee": [
        "consignee", "shipper", "customer", "cnee",
        "khach hang", "khách hàng", "chu hang", "chủ hàng",
        "nguoi gui", "người gửi", "nguoi nhan", "người nhận",
    ],
    "commodity": [
        "description", "description of goods", "goods", "commodity",
        "mat hang", "mặt hàng", "loai hang", "loại hàng",
        "ten hang", "tên hàng",
    ],
    "driver_name": [
        "driver", "tai xe", "tài xế", "lai xe", "lái xe",
        "nguoi lai", "người lái",
        # Glory Shanghai oddly translates this — keep it
        "nguoi ban hat nhan", "người bán hạt nhân",
    ],
    "tractor_plate": [
        "plate", "license plate", "bks", "bien so", "biển số",
        "so xe", "số xe", "dau keo", "đầu kéo", "tractor",
        "truck", "truck plate",
    ],
    "remarks": [
        "remark", "remarks", "note", "notes",
        "ghi chu", "ghi chú", "ghi chu nhap canh", "ghi chú nhập cảnh",
    ],
}


# Skip patterns — vessel/voyage/port/stowage/admin clutter. **Match exact
# normalized header text OR substring**; both are tried in
# `column_mapper.py`.
SKIP_PATTERNS: tuple[str, ...] = (
    # Vessel
    "vessel", "voyage", "voy", "voy no", "voy.",
    "tau", "tàu", "ten tau", "tên tàu",
    "tau trung quoc", "tàu trung quốc",  # "Chinese vessel name" — Glory file
    "ship", "ship name",
    "connecting vessel",
    # Schedule
    "ata", "atd", "eta", "etb", "etd", "etc",
    # Ports (operational vessel data, NOT customer-trucking destinations)
    "pol", "pod",
    "load port", "loading port",
    "disch port", "discharge port", "discharging port",
    "port of loading", "port of discharge", "port of discharging",
    # Stowage on ship
    "bay", "slot", "cell", "stowage",
    "vi tri hop", "vị trí hộp",
    # Crane
    "crane", "qc", "qc01", "qc02", "qc-tv",
    # Marketing/admin
    "sales", "mkt", "sales/mkt", "sales mkt",
    # Vessel admin
    "flag", "shipping agent",
    # Reefer config (we don't track reefer setpoints on TripOrder)
    "class", "temperature", "temp", "nhiet do", "nhiệt độ", "reefer",
    "do am", "độ ẩm", "thong gio", "thông gió",
    # Voyage / flight number
    "chuyen bay", "chuyến bay",
    # Generic ship-side counters — informational, not a customer order field
    "sq", "stt",
    # Vessel/operator-side fields (exact match — don't substring against
    # the much shorter synonym tokens)
    "hang tau", "hãng tàu",
    "hang khai thac", "hãng khai thác",
    "line operator", "operator", "opr",
    "line",
    # Process / direction labels (operational, not a per-trip field)
    "nhap/xuat", "nhập/xuất", "nhap xuat", "nhập xuất",
    "loai cong viec", "loại công việc",
    "phuong thuc ra", "phương thức ra",
    "hang noi/ngoai", "hàng nội/ngoại", "hang noi ngoai", "hàng nội ngoại",
    # Stowage / position
    "vi tri hop", "vị trí hộp",
    "hop xuat hien", "hộp xuất hiện",
    # Cell-position-style codes
    "ten day du cua trung quoc", "tên đầy đủ của trung quốc",
    "tau trung quoc", "tàu trung quốc",
    # Accountant-side annotations (these files often arrive after the
    # accountant has done pivot matching against our routes/pricing — we
    # ignore her scratch columns explicitly so they don't pollute the
    # mapping).
    "doi chieu", "đối chiếu",
    "match", "khop", "khớp",
    "ke toan", "kế toán",
    "tinh tien", "tính tiền",
    "thanh tien", "thành tiền",
    "don gia", "đơn giá",
    "cong thuc", "công thức",
    "gia dau", "giá dầu",
    # Free-text concatenation helper columns Excel users build for pivot
    # tables: usually contain CHAR-joined keys or '#NAME?' errors. Match
    # by exact short tokens used as helper-column headers.
    "noi dung hd", "nội dung hđ",
    "ky hieu cuoc", "ký hiệu cước",
)


# ---------------------------------------------------------------------------
# Build the reverse lookup tables once at import time.
#
# `EXACT_LOOKUP[normalized_header] = canonical_field_name`
# `SKIP_EXACT[normalized_header] = True` for skip-only headers
# ---------------------------------------------------------------------------

def _build_exact_lookup() -> dict[str, str]:
    out: dict[str, str] = {}
    for field, words in SYNONYMS.items():
        for w in words:
            n = normalize_header_text(w)
            if not n:
                continue
            # First-seen wins; longest synonym preferred elsewhere via
            # `synonym_substring_score`.
            out.setdefault(n, field)
    return out


def _build_skip_lookup() -> frozenset[str]:
    return frozenset(normalize_header_text(p) for p in SKIP_PATTERNS if normalize_header_text(p))


EXACT_LOOKUP: dict[str, str] = _build_exact_lookup()
SKIP_EXACT: frozenset[str] = _build_skip_lookup()


# Synonym substring matching is a fallback for headers that don't match
# the dictionary exactly. We restrict it to multi-word synonyms (length
# ≥ 6 and containing a space) so noisy single-token matches like "hang"
# inside "hang tau" / "hang noi ngoai" don't fire spuriously.
_SUBSTRING_SYNONYMS: list[tuple[str, str]] = sorted(
    [
        (normalize_header_text(w), field)
        for field, words in SYNONYMS.items()
        for w in words
        if len(normalize_header_text(w)) >= 6 and " " in normalize_header_text(w)
    ],
    key=lambda x: -len(x[0]),
)


def _is_word_bounded(haystack: str, needle: str) -> bool:
    """True if `needle` appears in `haystack` flanked by word boundaries
    (start/end of string or non-alphanumeric chars). Prevents 'ship' from
    matching inside 'shipper'."""
    idx = haystack.find(needle)
    while idx != -1:
        left_ok = (idx == 0) or not haystack[idx - 1].isalnum()
        right = idx + len(needle)
        right_ok = (right == len(haystack)) or not haystack[right].isalnum()
        if left_ok and right_ok:
            return True
        idx = haystack.find(needle, idx + 1)
    return False


def synonym_substring_match(normalized_header: str) -> str | None:
    """Return canonical field if a multi-word synonym appears as a
    word-bounded substring of the normalized header. Longest synonym
    wins. None if nothing matches."""
    if not normalized_header:
        return None
    for syn, field in _SUBSTRING_SYNONYMS:
        if _is_word_bounded(normalized_header, syn):
            return field
    return None


def is_skip_header(normalized_header: str) -> bool:
    """Exact-match against skip dictionary, with a word-bounded substring
    fallback for the multi-word patterns ('connecting vessel', 'port of
    loading'). Single-token skip patterns (`ship`, `flag`, `eta`) are
    exact-only — otherwise 'shipper' would be skipped as 'ship'.
    """
    if not normalized_header:
        return False
    if normalized_header in SKIP_EXACT:
        return True
    for pat in SKIP_EXACT:
        if len(pat) >= 6 and " " in pat and _is_word_bounded(normalized_header, pat):
            return True
    return False
