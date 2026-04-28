from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.base import User
from app.models.domain import Company
from app.core.deps import get_current_user

router = APIRouter()


class CompanyOut(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True


@router.get("/companies", response_model=list[CompanyOut])
async def list_companies(
    _current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all companies. Used for driver creation dropdown."""
    result = await db.execute(select(Company).order_by(Company.id.asc()))
    return result.scalars().all()
