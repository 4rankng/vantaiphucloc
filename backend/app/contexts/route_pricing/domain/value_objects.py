"""Value objects for the Route Pricing context."""

from __future__ import annotations

from typing import NewType


RoutePricingId = NewType("RoutePricingId", int)
LocationId = NewType("LocationId", int)
PartnerId = NewType("PartnerId", int)

OperationType = str
Money = int

VALID_OPERATION_TYPES: frozenset[str] = frozenset(
    {
        "XUẤT/NHẬP TÀU",
        "CHUYỂN BÃI",
        "LẤY VỎ HẠ HÀNG",
        "CHẠY SÀ LAN",
        "ĐÓNG KHO",
    }
)


def validate_operation_type(value: str) -> str:
    norm = value.strip()
    if norm not in VALID_OPERATION_TYPES:
        raise ValueError(
            f"Invalid operation_type '{norm}'. "
            f"Valid: {', '.join(sorted(VALID_OPERATION_TYPES))}"
        )
    return norm
