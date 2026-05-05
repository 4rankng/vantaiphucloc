"""Pydantic IN/OUT schemas for the Identity context's HTTP interface.

These are the wire format. Use cases work with application DTOs (plain
dataclasses); routers translate request -> DTO -> use case -> domain
entity -> response schema.
"""

from __future__ import annotations

import re
from datetime import datetime
from typing import Generic, Literal, TypeVar

from pydantic import BaseModel, field_validator

from app.contexts.identity.domain.entities import User as UserEntity

T = TypeVar("T")

RoleLiteral = Literal["superadmin", "director", "accountant", "driver"]


def _sanitize_identifier(value: str) -> str:
    return value.strip()[:255]


class PaginatedResponse(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    page_size: int
    total_pages: int


class MessageResponse(BaseModel):
    message: str


# ── Auth ────────────────────────────────────────────────────────────


class LoginRequest(BaseModel):
    username: str
    password: str

    @field_validator("username")
    @classmethod
    def sanitize_username(cls, v: str) -> str:
        return _sanitize_identifier(v)

    @field_validator("password")
    @classmethod
    def sanitize_password(cls, v: str) -> str:
        return v[:1024]


class RefreshTokenRequest(BaseModel):
    refresh_token: str


# ── User OUT ────────────────────────────────────────────────────────


class UserOut(BaseModel):
    id: int
    phone: str | None = None
    email: str | None = None
    username: str
    full_name: str | None = None
    cccd: str | None = None
    role: str
    vendor: str | None = None
    tractor_plate: str | None = None
    is_active: bool
    created_at: datetime

    @classmethod
    def from_entity(cls, user: UserEntity) -> "UserOut":
        assert user.id is not None
        return cls(
            id=int(user.id),
            phone=user.phone,
            email=user.email,
            username=user.username,
            full_name=user.full_name,
            cccd=user.cccd,
            role=user.role.value,
            vendor=user.vendor,
            tractor_plate=user.tractor_plate,
            is_active=user.is_active,
            created_at=user.created_at,
        )


class LoginResponse(BaseModel):
    user: UserOut
    access_token: str
    refresh_token: str
    token_type: str = "Bearer"
    expires_in: int


# ── User CRUD ───────────────────────────────────────────────────────


class UserCreate(BaseModel):
    phone: str | None = None
    email: str | None = None
    username: str
    password: str
    role: RoleLiteral = "driver"
    full_name: str | None = None
    cccd: str | None = None
    vendor: str | None = None
    tractor_plate: str | None = None

    @field_validator("cccd")
    @classmethod
    def validate_cccd(cls, v: str | None) -> str | None:
        if v is not None and v != "" and not re.match(r"^\d{12}$", v):
            raise ValueError("CCCD must be exactly 12 digits")
        return v


class UserUpdate(BaseModel):
    phone: str | None = None
    email: str | None = None
    username: str | None = None
    full_name: str | None = None
    cccd: str | None = None
    vendor: str | None = None
    role: RoleLiteral | None = None
    password: str | None = None
    tractor_plate: str | None = None
    is_active: bool | None = None

    @field_validator("cccd")
    @classmethod
    def validate_cccd(cls, v: str | None) -> str | None:
        if v is not None and v != "" and not re.match(r"^\d{12}$", v):
            raise ValueError("CCCD must be exactly 12 digits")
        return v


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


# ── Push ────────────────────────────────────────────────────────────


class PushSubscriptionCreate(BaseModel):
    endpoint: str
    p256dh: str
    auth: str
    user_agent: str | None = None


class PushSubscriptionOut(BaseModel):
    id: int
    endpoint: str
    created_at: str
