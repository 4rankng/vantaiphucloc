from __future__ import annotations

import unicodedata
from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import require_roles
from app.database import get_db
from app.models.base import User
from app.models.domain import Client, DeliveredTrip, Vehicle, Vendor

router = APIRouter(prefix="/chatbot", tags=["chatbot"])


class FastAnswerRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=1000)


class FastAnswerResponse(BaseModel):
    handled: bool
    intent: str | None = None
    answer: str | None = None
    data: dict[str, Any] = Field(default_factory=dict)
    source: str = "sql_fast_path"


class CompactContextResponse(BaseModel):
    staff: dict[str, int]
    fleet: dict[str, int]
    commercial: dict[str, int]
    operations: dict[str, int]
    notes: list[str]


def _normalize(text: str) -> str:
    no_marks = "".join(
        ch
        for ch in unicodedata.normalize("NFD", text.lower())
        if unicodedata.category(ch) != "Mn"
    )
    return " ".join(no_marks.split())


def _is_staff_count_question(message: str) -> bool:
    text = _normalize(message)
    count_terms = ("bao nhieu", "so luong", "dem", "count", "tong")
    staff_terms = (
        "nhan su",
        "lai xe",
        "tai xe",
        "ke toan",
        "giao nhan",
        "nhan vien",
        "staff",
        "driver",
        "accountant",
    )
    return any(term in text for term in count_terms) and any(
        term in text for term in staff_terms
    )


async def _active_role_counts(db: AsyncSession) -> dict[str, int]:
    rows = (
        await db.execute(
            select(User.role, func.count(User.id))
            .where(User.is_active == True)  # noqa: E712
            .group_by(User.role)
        )
    ).all()
    return {str(role): int(count) for role, count in rows}


def _staff_answer(role_counts: dict[str, int]) -> str:
    drivers = role_counts.get("driver", 0)
    accountants = role_counts.get("accountant", 0)
    directors = role_counts.get("director", 0)
    operational_staff = drivers + accountants + directors
    return (
        "Theo dữ liệu hệ thống hiện tại, công ty có "
        f"{operational_staff} nhân sự vận hành: {drivers} lái xe, "
        f"{accountants} kế toán và {directors} giám đốc. "
        "Hệ thống chưa có vai trò riêng cho giao nhận; phần này thường nằm "
        "trong nhóm lái xe/khai thác."
    )


async def _compact_context(db: AsyncSession) -> CompactContextResponse:
    role_counts = await _active_role_counts(db)

    vehicle_count = (
        await db.execute(
            select(func.count(Vehicle.id)).where(Vehicle.is_active == True)  # noqa: E712
        )
    ).scalar() or 0
    client_count = (
        await db.execute(
            select(func.count(Client.id)).where(Client.is_active == True)  # noqa: E712
        )
    ).scalar() or 0
    vendor_count = (
        await db.execute(
            select(func.count(Vendor.id)).where(Vendor.is_active == True)  # noqa: E712
        )
    ).scalar() or 0
    delivered_count = (
        await db.execute(select(func.count(DeliveredTrip.id)))
    ).scalar() or 0
    matched_count = (
        await db.execute(
            select(func.count(DeliveredTrip.id)).where(
                DeliveredTrip.booked_trip_id.isnot(None)
            )
        )
    ).scalar() or 0

    drivers = role_counts.get("driver", 0)
    accountants = role_counts.get("accountant", 0)
    directors = role_counts.get("director", 0)
    superadmins = role_counts.get("superadmin", 0)

    return CompactContextResponse(
        staff={
            "operational_total": drivers + accountants + directors,
            "drivers": drivers,
            "accountants": accountants,
            "directors": directors,
            "superadmins": superadmins,
        },
        fleet={"vehicles": int(vehicle_count)},
        commercial={"clients": int(client_count), "vendors": int(vendor_count)},
        operations={
            "delivered_trips": int(delivered_count),
            "matched_delivered_trips": int(matched_count),
        },
        notes=[
            "giao_nhan_is_not_separate_role",
            "driver_rows_are_users_with_role_driver",
        ],
    )


@router.post("/fast-answer", response_model=FastAnswerResponse)
async def chatbot_fast_answer(
    body: FastAnswerRequest,
    _current_user: User = Depends(require_roles("superadmin", "director", "accountant")),
    db: AsyncSession = Depends(get_db),
):
    if not _is_staff_count_question(body.message):
        return FastAnswerResponse(handled=False)

    role_counts = await _active_role_counts(db)
    drivers = role_counts.get("driver", 0)
    accountants = role_counts.get("accountant", 0)
    directors = role_counts.get("director", 0)
    return FastAnswerResponse(
        handled=True,
        intent="staff_count",
        answer=_staff_answer(role_counts),
        data={
            "operational_staff": drivers + accountants + directors,
            "drivers": drivers,
            "accountants": accountants,
            "directors": directors,
            "superadmins": role_counts.get("superadmin", 0),
            "role_counts": role_counts,
            "llm_should_skip": True,
        },
    )


@router.get("/compact-context", response_model=CompactContextResponse)
async def chatbot_compact_context(
    _current_user: User = Depends(require_roles("superadmin", "director", "accountant")),
    db: AsyncSession = Depends(get_db),
):
    return await _compact_context(db)
