import re
from datetime import datetime
from typing import Generic, Literal, TypeVar

from pydantic import BaseModel, field_validator

T = TypeVar("T")

RoleType = Literal["superadmin", "director", "accountant", "driver"]


class PaginatedResponse(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    page_size: int
    total_pages: int


# ── Input sanitization ──────────────────────────────────────────────


def _sanitize_identifier(value: str) -> str:
    return value.strip()[:255]


# Auth
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


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "Bearer"
    expires_in: int


class UserOut(BaseModel):
    id: int
    phone: str | None = None
    email: str | None = None
    username: str
    full_name: str | None = None
    cccd: str | None = None
    role: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class LoginResponse(BaseModel):
    user: UserOut
    access_token: str
    refresh_token: str
    token_type: str = "Bearer"
    expires_in: int


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class MessageResponse(BaseModel):
    message: str


# User CRUD
class UserCreate(BaseModel):
    phone: str | None = None
    email: str | None = None
    username: str
    password: str
    role: RoleType = "driver"
    full_name: str | None = None
    cccd: str | None = None

    @field_validator("cccd")
    @classmethod
    def validate_cccd(cls, v: str | None) -> str | None:
        if v is not None and not re.match(r"^\d{12}$", v):
            raise ValueError("CCCD must be exactly 12 digits")
        return v


class UserUpdate(BaseModel):
    phone: str | None = None
    email: str | None = None
    username: str | None = None
    full_name: str | None = None
    cccd: str | None = None
    role: RoleType | None = None
    password: str | None = None
    is_active: bool | None = None

    @field_validator("cccd")
    @classmethod
    def validate_cccd(cls, v: str | None) -> str | None:
        if v is not None and not re.match(r"^\d{12}$", v):
            raise ValueError("CCCD must be exactly 12 digits")
        return v


class ChangePassword(BaseModel):
    current_password: str
    new_password: str
