"""Value objects for the Route Pricing context."""

from __future__ import annotations

from typing import NewType


RoutePricingId = NewType("RoutePricingId", int)
LocationId = NewType("LocationId", int)
PartnerId = NewType("PartnerId", int)

WorkType = str
Money = int

VALID_WORK_TYPES: frozenset[str] = frozenset(
    {
        "XUẤT/NHẬP TÀU",
        "CHUYỂN BÃI",
        "LẤY VỎ HẠ HÀNG",
        "CHẠY SÀ LAN",
        "ĐÓNG KHO",
    }
)


def validate_work_type(value: str) -> str:
    norm = value.strip()
    if norm not in VALID_WORK_TYPES:
        raise ValueError(
            f"Invalid work_type '{norm}'. "
            f"Valid: {', '.join(sorted(VALID_WORK_TYPES))}"
        )
    return norm
