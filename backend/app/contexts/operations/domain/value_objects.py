"""Value objects for the Operations context."""

from __future__ import annotations

from typing import NewType


# ── Identifiers ─────────────────────────────────────────────────

BookedTripId = NewType("BookedTripId", int)
DeliveredTripId = NewType("DeliveredTripId", int)


# VND amounts (no decimals).
Money = int


# Known work types (container types + operation types). Not enforced as a
# strict set — users can add custom values. Listed here for reference and
# autocomplete in the UI.
KNOWN_WORK_TYPES = {
    # Container types
    "E20",
    "E40",
    "F20",
    "F40",
    # Operation types (Tác nghiệp)
    "XUẤT/NHẬP TÀU",
    "CHUYỂN BÃI",
    "LẤY VỎ HẠ HÀNG",
    "CHẠY SÀ LAN",
    "ĐÓNG KHO",
}


def normalize_work_type(value: str | None) -> str:
    if value is None:
        raise ValueError("work_type is required")
    norm = value.strip()
    if not norm:
        raise ValueError("work_type cannot be empty")
    return norm
