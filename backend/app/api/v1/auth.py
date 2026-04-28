from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.base import User
from app.schemas.base import LoginRequest
from app.core.security import verify_password, create_access_token

router = APIRouter(prefix="/auth")


@router.post("/login")
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.phone == body.phone))
    user = result.scalars().first()

    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid phone or password")

    token = create_access_token({
        "id": user.id,
        "name": user.username,
        "role": user.role,
        "company_id": user.company_id,
    })

    return {"access_token": token, "token_type": "Bearer", "role": user.role}
