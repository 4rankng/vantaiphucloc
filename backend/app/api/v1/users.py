import math

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select

from app.models.base import User
from app.models.domain import WorkOrder
from app.schemas.base import UserOut, UserCreate, UserUpdate, ChangePassword, MessageResponse, PaginatedResponse
from app.core.deps import require_permission, get_current_user
from app.core.security import hash_password, verify_password
from app.repositories.user_repo import UserRepository
from app.repositories.deps import get_user_repo

router = APIRouter()


@router.get("/users/me", response_model=UserOut)
async def get_own_profile(
    current_user: User = Depends(get_current_user),
):
    return current_user


@router.put("/users/me", response_model=UserOut)
async def update_own_profile(
    body: UserUpdate,
    current_user: User = Depends(get_current_user),
    repo: UserRepository = Depends(get_user_repo),
):
    update_data = body.model_dump(exclude_unset=True)

    # Only allow safe self-editable fields
    allowed = {"full_name", "phone", "username"}
    update_data = {k: v for k, v in update_data.items() if k in allowed}

    if "phone" in update_data and update_data["phone"]:
        existing = await repo.session.execute(
            select(User).where(User.phone == update_data["phone"], User.id != current_user.id)
        )
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=409, detail="Phone number already registered")

    if "username" in update_data and update_data["username"]:
        existing = await repo.session.execute(
            select(User).where(User.username == update_data["username"], User.id != current_user.id)
        )
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=409, detail="Tên đăng nhập đã được sử dụng")

    await repo.update(current_user, **update_data)
    await repo.session.commit()
    await repo.session.refresh(current_user)
    return current_user


@router.get("/users", response_model=PaginatedResponse[UserOut])
async def list_users(
    role: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    current_user: User = Depends(require_permission("list", "User")),
    repo: UserRepository = Depends(get_user_repo),
):
    filters: dict = {}
    if role:
        filters["role"] = role

    query = select(User).order_by(User.username.asc())
    count_query = select(User.id)

    if current_user.role == "director":
        query = query.where(User.role != "superadmin")
        count_query = count_query.where(User.role != "superadmin")
    if role:
        query = query.where(User.role == role)
        count_query = count_query.where(User.role == role)

    from sqlalchemy import func
    total_q = await repo.session.execute(select(func.count()).select_from(count_query.subquery()))
    total = total_q.scalar() or 0

    result = await repo.session.execute(
        query.offset((page - 1) * page_size).limit(page_size)
    )
    users = result.scalars().all()

    return PaginatedResponse[UserOut](
        items=[UserOut.model_validate(u) for u in users],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(total / page_size) if total > 0 else 0,
    )


@router.post("/users", response_model=UserOut, status_code=201)
async def create_user(
    body: UserCreate,
    current_user: User = Depends(require_permission("list", "User")),
    repo: UserRepository = Depends(get_user_repo),
):
    if current_user.role == "director" and body.role == "superadmin":
        raise HTTPException(status_code=403, detail="Directors cannot create superadmin users")

    if body.phone and await repo.find_by_phone(body.phone):
        raise HTTPException(status_code=409, detail="Phone number already registered")
    if await repo.find_by_username(body.username):
        raise HTTPException(status_code=409, detail="Username already registered")
    if body.email and await repo.find_by_email(body.email):
        raise HTTPException(status_code=409, detail="Email already registered")
    if body.cccd and await repo.find_one(cccd=body.cccd):
        raise HTTPException(status_code=409, detail="CCCD already registered")

    user = await repo.create(
        phone=body.phone,
        email=body.email,
        username=body.username,
        full_name=body.full_name,
        cccd=body.cccd,
        hashed_password=hash_password(body.password),
        role=body.role,
        is_active=True,
        vendor=body.vendor,
        tractor_plate=body.tractor_plate,
    )
    await repo.session.commit()
    await repo.session.refresh(user)
    return user


@router.put("/users/{user_id}", response_model=UserOut)
async def update_user(
    user_id: int,
    body: UserUpdate,
    current_user: User = Depends(require_permission("list", "User")),
    repo: UserRepository = Depends(get_user_repo),
):
    user = await repo.get_by_id_or_404(user_id)

    if current_user.role == "director" and user.role == "superadmin":
        raise HTTPException(status_code=403, detail="Directors cannot update superadmin users")
    if current_user.role == "director" and body.role == "superadmin":
        raise HTTPException(status_code=403, detail="Directors cannot promote users to superadmin")

    update_data = body.model_dump(exclude_unset=True)

    if "phone" in update_data and update_data["phone"]:
        existing = await repo.session.execute(
            select(User).where(User.phone == update_data["phone"], User.id != user_id)
        )
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=409, detail="Phone number already registered")

    if "username" in update_data and update_data["username"]:
        existing = await repo.session.execute(
            select(User).where(User.username == update_data["username"], User.id != user_id)
        )
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=409, detail="Username already registered")

    if "email" in update_data and update_data["email"]:
        existing = await repo.session.execute(
            select(User).where(User.email == update_data["email"], User.id != user_id)
        )
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=409, detail="Email already registered")

    if "cccd" in update_data and update_data["cccd"]:
        existing = await repo.session.execute(
            select(User).where(User.cccd == update_data["cccd"], User.id != user_id)
        )
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=409, detail="CCCD already registered")

    if "password" in update_data and update_data["password"]:
        update_data["hashed_password"] = hash_password(update_data.pop("password"))
    elif "password" in update_data:
        update_data.pop("password")

    await repo.update(user, **update_data)
    await repo.session.commit()
    await repo.session.refresh(user)
    return user


@router.delete("/users/{user_id}", status_code=204)
async def delete_user(
    user_id: int,
    current_user: User = Depends(require_permission("list", "User")),
    repo: UserRepository = Depends(get_user_repo),
):
    user = await repo.get_by_id_or_404(user_id)

    if current_user.role == "director" and user.role == "superadmin":
        raise HTTPException(status_code=403, detail="Directors cannot delete superadmin users")

    if user.role == "driver":
        active_wo = await repo.session.execute(
            select(WorkOrder)
            .where(WorkOrder.driver_id == user_id, WorkOrder.status != "MATCHED")
            .limit(1)
        )
        if active_wo.scalar_one_or_none():
            raise HTTPException(
                status_code=409,
                detail="Cannot deactivate driver with active (unmatched) work orders",
            )

    await repo.soft_delete(user)
    await repo.session.commit()


@router.post("/change-password", response_model=MessageResponse)
async def change_password(
    body: ChangePassword,
    current_user: User = Depends(get_current_user),
    repo: UserRepository = Depends(get_user_repo),
):
    if not verify_password(body.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    await repo.update(current_user, hashed_password=hash_password(body.new_password))
    await repo.session.commit()
    return MessageResponse(message="Password changed successfully")
