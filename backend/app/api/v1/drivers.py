from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.base import User
from app.schemas.domain import DriverCreate, DriverOut
from app.core.deps import get_current_user, require_roles
from app.core.security import hash_password

router = APIRouter()


@router.get("/drivers", response_model=list[DriverOut])
async def list_drivers(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(User).where(
            User.company_id == current_user.company_id,
            User.role == "driver",
        ).order_by(User.username.asc())
    )
    return result.scalars().all()


@router.post("/drivers", response_model=DriverOut, status_code=201)
async def create_driver(
    body: DriverCreate,
    current_user: User = Depends(require_roles("accountant", "superadmin")),
    db: AsyncSession = Depends(get_db),
):
    # Default password is the phone number
    driver = User(
        phone=body.phone,
        username=body.username,
        hashed_password=hash_password(body.phone),
        role="driver",
        company_id=current_user.company_id,
        is_active=True,
        tractor_plate=body.tractor_plate,
    )
    db.add(driver)
    await db.commit()
    await db.refresh(driver)

    return driver
