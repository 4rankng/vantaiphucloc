from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.base import User
from app.schemas.base import UserOut, UserCreate, UserUpdate, ChangePassword, MessageResponse
from app.core.deps import require_roles
from app.core.security import hash_password, verify_password

router = APIRouter()


@router.get("/users", response_model=list[UserOut])
async def list_users(
    role: str | None = None,
    current_user: User = Depends(require_roles("director", "superadmin")),
    db: AsyncSession = Depends(get_db),
):
    query = select(User).order_by(User.username.asc())
    if role:
        query = query.where(User.role == role)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/users", response_model=UserOut, status_code=201)
async def create_user(
    body: UserCreate,
    current_user: User = Depends(require_roles("director", "superadmin")),
    db: AsyncSession = Depends(get_db),
):
    # Check phone uniqueness
    existing = await db.execute(select(User).where(User.phone == body.phone))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Phone number already registered")

    user = User(
        phone=body.phone,
        email=body.email,
        username=body.username,
        hashed_password=hash_password(body.password),
        role=body.role,
        is_active=True,
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
