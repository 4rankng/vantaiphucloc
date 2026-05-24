"""Application DTOs (data transfer objects).

These cross the application boundary in/out of use cases. They are not
domain entities and not Pydantic schemas — plain dataclasses keep the
application layer free of framework dependencies.
"""

from __future__ import annotations

from dataclasses import dataclass

from app.contexts.identity.domain.value_objects import UserRole


@dataclass(frozen=True)
class AuthenticateInput:
    identifier: str
    password: str


@dataclass(frozen=True)
class AuthenticateResult:
    user_id: int
    username: str
    role: str
    access_token: str
    refresh_token: str
    expires_in: int


@dataclass(frozen=True)
class CreateUserInput:
    username: str
    password: str
    role: UserRole
    phone: str | None = None
    email: str | None = None
    full_name: str | None = None
    cccd: str | None = None


@dataclass(frozen=True)
class UpdateUserInput:
    user_id: int
    username: str | None = None
    phone: str | None = None
    email: str | None = None
    full_name: str | None = None
    cccd: str | None = None
    role: UserRole | None = None
    is_active: bool | None = None
    new_password: str | None = None


@dataclass(frozen=True)
class ChangePasswordInput:
    user_id: int
    current_password: str
    new_password: str


@dataclass(frozen=True)
class UpdateProfileInput:
    user_id: int
    full_name: str | None = None
    phone: str | None = None
    username: str | None = None
    email: str | None = None


@dataclass(frozen=True)
class UserListFilter:
    page: int
    page_size: int
    role: UserRole | None
    exclude_superadmin: bool
    search: str | None = None
    sort_by: str | None = None
    sort_order: str = 'asc'


@dataclass(frozen=True)
class PushRegisterInput:
    user_id: int
    endpoint: str
    p256dh: str
    auth: str
    user_agent: str | None
