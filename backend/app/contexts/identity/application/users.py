"""User CRUD + password use cases."""

from __future__ import annotations

from typing import Sequence

from app.contexts.identity.application.dto import (
    ChangePasswordInput,
    CreateUserInput,
    UpdateProfileInput,
    UpdateUserInput,
    UserListFilter,
)
from app.contexts.identity.domain.entities import User
from app.contexts.identity.domain.exceptions import (
    DuplicateCccd,
    DuplicateEmail,
    DuplicatePhone,
    DuplicateUsername,
    PermissionDenied,
    UserNotFound,
)
from app.contexts.identity.domain.repositories import UserRepository
from app.contexts.identity.domain.services import PasswordHasher
from app.contexts.identity.domain.value_objects import UserId, UserRole


async def _check_unique(
    users: UserRepository,
    *,
    phone: str | None,
    email: str | None,
    username: str | None,
    cccd: str | None,
    excluding_user_id: UserId | None = None,
) -> None:
    """Raise the relevant Duplicate* exception if a conflict exists."""
    if phone:
        existing = await users.find_by_phone(phone)
        if existing and existing.id != excluding_user_id:
            raise DuplicatePhone("Phone number already registered")
    if email:
        existing = await users.find_by_email(email)
        if existing and existing.id != excluding_user_id:
            raise DuplicateEmail("Email already registered")
    if username:
        existing = await users.find_by_username(username)
        if existing and existing.id != excluding_user_id:
            raise DuplicateUsername("Username already registered")
    if cccd:
        existing = await users.find_by_cccd(cccd)
        if existing and existing.id != excluding_user_id:
            raise DuplicateCccd("CCCD already registered")


class CreateUser:
    def __init__(self, users: UserRepository, hasher: PasswordHasher) -> None:
        self._users = users
        self._hasher = hasher

    async def execute(self, cmd: CreateUserInput, *, actor_role: UserRole) -> User:
        if actor_role is UserRole.DIRECTOR and cmd.role is UserRole.SUPERADMIN:
            raise PermissionDenied("Directors cannot create superadmin users")
        await _check_unique(
            self._users,
            phone=cmd.phone,
            email=cmd.email,
            username=cmd.username,
            cccd=cmd.cccd,
        )
        user = User(
            id=None,
            username=cmd.username,
            hashed_password=self._hasher.hash(cmd.password),
            role=cmd.role,
            phone=cmd.phone,
            email=cmd.email,
            full_name=cmd.full_name,
            cccd=cmd.cccd,
        )
        return await self._users.add(user)


class UpdateUser:
    def __init__(self, users: UserRepository, hasher: PasswordHasher) -> None:
        self._users = users
        self._hasher = hasher

    async def execute(self, cmd: UpdateUserInput, *, actor_role: UserRole) -> User:
        user = await self._users.get_by_id(UserId(cmd.user_id))
        if user is None:
            raise UserNotFound("User not found")
        if actor_role is UserRole.DIRECTOR and user.is_superadmin:
            raise PermissionDenied("Directors cannot update superadmin users")

        await _check_unique(
            self._users,
            phone=cmd.phone,
            email=cmd.email,
            username=cmd.username,
            cccd=cmd.cccd,
            excluding_user_id=user.id,
        )
        user.update_profile(
            full_name=cmd.full_name,
            phone=cmd.phone,
            username=cmd.username,
            email=cmd.email,
            cccd=cmd.cccd,
        )
        if cmd.role is not None:
            user.assign_role(cmd.role, actor_role=actor_role)
        if cmd.is_active is not None:
            if cmd.is_active:
                user.activate()
            else:
                user.deactivate()
        if cmd.new_password:
            user.reset_password(cmd.new_password, self._hasher)
        return await self._users.save(user)


class DeleteUser:
    """Soft-delete (sets is_active=false). Drivers with active unmatched WOs are blocked."""

    def __init__(self, users: UserRepository) -> None:
        self._users = users

    async def execute(self, user_id: int, *, actor_role: UserRole) -> None:
        user = await self._users.get_by_id(UserId(user_id))
        if user is None:
            raise UserNotFound("User not found")
        if actor_role is UserRole.DIRECTOR and user.is_superadmin:
            raise PermissionDenied("Directors cannot delete superadmin users")
        if user.is_driver:
            blocked = await self._users.has_active_unmatched_delivered_trips(UserId(user_id))
            if blocked:
                raise PermissionDenied(
                    "Cannot deactivate driver with active (unmatched) work orders"
                )
        user.deactivate()
        await self._users.save(user)


class ChangePassword:
    def __init__(self, users: UserRepository, hasher: PasswordHasher) -> None:
        self._users = users
        self._hasher = hasher

    async def execute(self, cmd: ChangePasswordInput) -> None:
        user = await self._users.get_by_id(UserId(cmd.user_id))
        if user is None:
            raise UserNotFound("User not found")
        user.change_password(cmd.current_password, cmd.new_password, self._hasher)
        await self._users.save(user)


class UpdateOwnProfile:
    """Self-service profile edit. Only safe fields (full_name, phone, username)."""

    def __init__(self, users: UserRepository) -> None:
        self._users = users

    async def execute(self, cmd: UpdateProfileInput) -> User:
        user = await self._users.get_by_id(UserId(cmd.user_id))
        if user is None:
            raise UserNotFound("User not found")
        await _check_unique(
            self._users,
            phone=cmd.phone,
            email=cmd.email,
            username=cmd.username,
            cccd=None,
            excluding_user_id=user.id,
        )
        user.update_profile(
            full_name=cmd.full_name,
            phone=cmd.phone,
            username=cmd.username,
            email=cmd.email,
        )
        return await self._users.save(user)


class ListUsers:
    def __init__(self, users: UserRepository) -> None:
        self._users = users

    async def execute(
        self, filter: UserListFilter
    ) -> tuple[Sequence[User], int]:
        offset = (filter.page - 1) * filter.page_size
        return await self._users.list(
            offset=offset,
            limit=filter.page_size,
            role_filter=filter.role,
            exclude_role=UserRole.SUPERADMIN if filter.exclude_superadmin else None,
            search=filter.search,
            sort_by=filter.sort_by,
            sort_order=filter.sort_order,
        )
