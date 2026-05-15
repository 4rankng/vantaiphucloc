"""HTTP routes for users CRUD + change-password + own-profile."""

from __future__ import annotations

import math

from fastapi import APIRouter, Depends, Query

from app.contexts.identity.application import (
    ChangePassword,
    ChangePasswordInput,
    CreateUser,
    CreateUserInput,
    DeleteUser,
    ListUsers,
    UpdateOwnProfile,
    UpdateUser,
    UpdateUserInput,
    UserListFilter,
)
from app.contexts.identity.application.dto import UpdateProfileInput
from app.contexts.identity.domain.exceptions import IdentityDomainError
from app.contexts.identity.domain.repositories import UserRepository
from app.contexts.identity.domain.value_objects import UserId, UserRole
from app.contexts.identity.interface.dependencies import (
    get_change_password,
    get_create_user,
    get_delete_user,
    get_list_users,
    get_update_own_profile,
    get_update_user,
    get_user_repository,
)
from app.contexts.identity.interface.error_translation import to_http
from app.contexts.identity.interface.schemas import (
    ChangePasswordRequest,
    MessageResponse,
    PaginatedResponse,
    UserCreate,
    UserOut,
    UserUpdate,
)
from app.core.deps import get_current_user, require_permission
from app.models.base import User as UserORM  # ORM, used for ACL gates only

router = APIRouter()


def _actor_role(user: UserORM) -> UserRole:
    return UserRole.from_str(user.role)


@router.get("/users/me", response_model=UserOut)
async def get_own_profile(
    current_user: UserORM = Depends(get_current_user),
    repo: UserRepository = Depends(get_user_repository),
):
    user = await repo.get_by_id(UserId(current_user.id))
    if user is None:  # pragma: no cover
        raise to_http(IdentityDomainError("User not found"))
    return UserOut.from_entity(user)


@router.put("/users/me", response_model=UserOut)
async def update_own_profile(
    body: UserUpdate,
    current_user: UserORM = Depends(get_current_user),
    use_case: UpdateOwnProfile = Depends(get_update_own_profile),
):
    payload = body.model_dump(exclude_unset=True)
    cmd = UpdateProfileInput(
        user_id=current_user.id,
        full_name=payload.get("full_name"),
        phone=payload.get("phone"),
        username=payload.get("username"),
    )
    try:
        user = await use_case.execute(cmd)
    except IdentityDomainError as e:
        raise to_http(e)
    return UserOut.from_entity(user)


@router.get("/users", response_model=PaginatedResponse[UserOut])
async def list_users(
    role: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    current_user: UserORM = Depends(require_permission("list", "User")),
    use_case: ListUsers = Depends(get_list_users),
):
    role_filter = UserRole.from_str(role) if role else None
    exclude_superadmin = current_user.role == "director"
    items, total = await use_case.execute(
        UserListFilter(
            page=page,
            page_size=page_size,
            role=role_filter,
            exclude_superadmin=exclude_superadmin,
        )
    )

    # Batch-load vehicle plates for driver-role users
    driver_ids = [int(u.id) for u in items if u.role == UserRole.DRIVER and u.id is not None]  # type: ignore[arg-type]
    plate_map: dict[int, str] = {}
    if driver_ids:
        from sqlalchemy import select as sa_select
        from app.models.domain import Vehicle, VehicleDriver
        result = await use_case._users.session.execute(
            sa_select(VehicleDriver.driver_id, Vehicle.plate)
            .join(Vehicle, Vehicle.id == VehicleDriver.vehicle_id)
            .where(
                VehicleDriver.driver_id.in_(driver_ids),
                VehicleDriver.is_active == True,  # noqa: E712
                VehicleDriver.role == "PRIMARY",
                Vehicle.is_active == True,  # noqa: E712
            )
        )
        for row in result.all():
            plate_map[row[0]] = row[1]

    return PaginatedResponse[UserOut](
        items=[
            UserOut.from_entity(u, vehicle_plate=plate_map.get(int(u.id)) if u.role == UserRole.DRIVER else None)  # type: ignore[arg-type]
            for u in items
        ],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(total / page_size) if total > 0 else 0,
    )


@router.post("/users", response_model=UserOut, status_code=201)
async def create_user(
    body: UserCreate,
    current_user: UserORM = Depends(require_permission("create", "User")),
    use_case: CreateUser = Depends(get_create_user),
):
    cmd = CreateUserInput(
        username=body.username,
        password=body.password,
        role=UserRole.from_str(body.role),
        phone=body.phone,
        email=body.email,
        full_name=body.full_name,
        cccd=body.cccd,
    )
    try:
        user = await use_case.execute(cmd, actor_role=_actor_role(current_user))
    except IdentityDomainError as e:
        raise to_http(e)
    return UserOut.from_entity(user)


@router.put("/users/{user_id}", response_model=UserOut)
async def update_user(
    user_id: int,
    body: UserUpdate,
    current_user: UserORM = Depends(require_permission("update", "User")),
    use_case: UpdateUser = Depends(get_update_user),
):
    payload = body.model_dump(exclude_unset=True)
    new_role = payload.get("role")
    cmd = UpdateUserInput(
        user_id=user_id,
        username=payload.get("username"),
        phone=payload.get("phone"),
        email=payload.get("email"),
        full_name=payload.get("full_name"),
        cccd=payload.get("cccd"),
        role=UserRole.from_str(new_role) if new_role else None,
        is_active=payload.get("is_active"),
        new_password=payload.get("password"),
    )
    try:
        user = await use_case.execute(cmd, actor_role=_actor_role(current_user))
    except IdentityDomainError as e:
        raise to_http(e)
    return UserOut.from_entity(user)


@router.delete("/users/{user_id}", status_code=204)
async def delete_user(
    user_id: int,
    current_user: UserORM = Depends(require_permission("delete", "User")),
    use_case: DeleteUser = Depends(get_delete_user),
):
    try:
        await use_case.execute(user_id, actor_role=_actor_role(current_user))
    except IdentityDomainError as e:
        raise to_http(e)


@router.post("/change-password", response_model=MessageResponse)
async def change_password(
    body: ChangePasswordRequest,
    current_user: UserORM = Depends(get_current_user),
    use_case: ChangePassword = Depends(get_change_password),
):
    try:
        await use_case.execute(
            ChangePasswordInput(
                user_id=current_user.id,
                current_password=body.current_password,
                new_password=body.new_password,
            )
        )
    except IdentityDomainError as e:
        raise to_http(e)
    return MessageResponse(message="Password changed successfully")
