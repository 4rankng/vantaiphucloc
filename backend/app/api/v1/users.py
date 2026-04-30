import math

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.models.base import User
from app.models.domain import WorkOrder
from app.schemas.base import UserOut, UserCreate, UserUpdate, ChangePassword, MessageResponse, PaginatedResponse
from app.core.deps import require_roles, get_current_user
from app.core.security import hash_password, verify_password

router = APIRouter()


@router.get("/users", response_model=PaginatedResponse[UserOut])
async def list_users(
    role: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    current_user: User = Depends(require_roles("director", "superadmin")),
    db: AsyncSession = Depends(get_db),
):
    query = select(User).order_by(User.username.asc())
    count_query = select(func.count(User.id))

    if role:
        query = query.where(User.role == role)
        count_query = count_query.where(User.role == role)

    total_q = await db.execute(count_query)
    total = total_q.scalar() or 0

    result = await db.execute(
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
    current_user: User = Depends(require_roles("director", "superadmin")),
    db: AsyncSession = Depends(get_db),
):
    # Check phone uniqueness (only if phone provided)
    if body.phone:
        existing = await db.execute(select(User).where(User.phone == body.phone))
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=409, detail="Phone number already registered")

    # Check username uniqueness
    existing_username = await db.execute(select(User).where(User.username == body.username))
    if existing_username.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Username already registered")

    # Check email uniqueness (only if email provided)
    if body.email:
        existing_email = await db.execute(select(User).where(User.email == body.email))
        if existing_email.scalar_one_or_none():
            raise HTTPException(status_code=409, detail="Email already registered")

    # Check CCCD uniqueness (only if CCCD provided)
    if body.cccd:
        existing_cccd = await db.execute(select(User).where(User.cccd == body.cccd))
        if existing_cccd.scalar_one_or_none():
            raise HTTPException(status_code=409, detail="CCCD already registered")

    user = User(
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
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@router.put("/users/{user_id}", response_model=UserOut)
async def update_user(
    user_id: int,
    body: UserUpdate,
    current_user: User = Depends(require_roles("director", "superadmin")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    update_data = body.model_dump(exclude_unset=True)

    # Validate phone uniqueness if being updated
    if "phone" in update_data and update_data["phone"]:
        existing = await db.execute(
            select(User).where(User.phone == update_data["phone"], User.id != user_id)
        )
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=409, detail="Phone number already registered")

    # Validate username uniqueness if being updated
    if "username" in update_data and update_data["username"]:
        existing_username = await db.execute(
            select(User).where(User.username == update_data["username"], User.id != user_id)
        )
        if existing_username.scalar_one_or_none():
            raise HTTPException(status_code=409, detail="Username already registered")

    # Validate email uniqueness if being updated
    if "email" in update_data and update_data["email"]:
        existing_email = await db.execute(
            select(User).where(User.email == update_data["email"], User.id != user_id)
        )
        if existing_email.scalar_one_or_none():
            raise HTTPException(status_code=409, detail="Email already registered")

    # Validate CCCD uniqueness if being updated
    if "cccd" in update_data and update_data["cccd"]:
        existing_cccd = await db.execute(
            select(User).where(User.cccd == update_data["cccd"], User.id != user_id)
        )
        if existing_cccd.scalar_one_or_none():
            raise HTTPException(status_code=409, detail="CCCD already registered")

    # If password is being updated, hash it
    if "password" in update_data and update_data["password"]:
        user.hashed_password = hash_password(update_data.pop("password"))
    elif "password" in update_data:
        update_data.pop("password")

    for field, value in update_data.items():
        setattr(user, field, value)

    await db.commit()
    await db.refresh(user)
    return user


@router.delete("/users/{user_id}", status_code=204)
async def delete_user(
    user_id: int,
    current_user: User = Depends(require_roles("superadmin")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    # Guard: prevent deactivating drivers with active unmatched work orders
    if user.role == "driver":
        active_wo = await db.execute(
            select(WorkOrder)
            .where(WorkOrder.driver_id == user_id, WorkOrder.status != "MATCHED")
            .limit(1)
        )
        if active_wo.scalar_one_or_none():
            raise HTTPException(
                status_code=409,
                detail="Cannot deactivate driver with active (unmatched) work orders",
            )

    # Soft delete — deactivate instead of removing
    user.is_active = False
    await db.commit()


@router.post("/change-password", response_model=MessageResponse)
async def change_password(
    body: ChangePassword,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not verify_password(body.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    current_user.hashed_password = hash_password(body.new_password)
    await db.commit()
    return MessageResponse(message="Password changed successfully")
