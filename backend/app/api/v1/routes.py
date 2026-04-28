from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.base import User
from app.models.domain import Route
from app.schemas.domain import RouteCreate, RouteUpdate, RouteOut
from app.core.deps import require_roles

router = APIRouter()


@router.get("/routes", response_model=list[RouteOut])
async def list_routes(
    current_user: User = Depends(require_roles("accountant", "director", "superadmin")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Route)
        .where(Route.company_id == current_user.company_id)
        .order_by(Route.route.asc())
    )
    return result.scalars().all()


@router.post("/routes", response_model=RouteOut, status_code=201)
async def create_route(
    body: RouteCreate,
    current_user: User = Depends(require_roles("accountant", "superadmin")),
    db: AsyncSession = Depends(get_db),
):
    route = Route(
        company_id=current_user.company_id,
        **body.model_dump(),
    )
    db.add(route)
    await db.commit()
    await db.refresh(route)
    return route


@router.put("/routes/{route_id}", response_model=RouteOut)
async def update_route(
    route_id: int,
    body: RouteUpdate,
    current_user: User = Depends(require_roles("accountant", "superadmin")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Route).where(
            Route.id == route_id,
            Route.company_id == current_user.company_id,
        )
    )
    route = result.scalar_one_or_none()
    if route is None:
        raise HTTPException(status_code=404, detail="Route not found")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(route, field, value)

    await db.commit()
    await db.refresh(route)
    return route


@router.delete("/routes/{route_id}", status_code=204)
async def delete_route(
    route_id: int,
    current_user: User = Depends(require_roles("accountant", "superadmin")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Route).where(
            Route.id == route_id,
            Route.company_id == current_user.company_id,
        )
    )
    route = result.scalar_one_or_none()
    if route is None:
        raise HTTPException(status_code=404, detail="Route not found")

    await db.delete(route)
    await db.commit()
    return Response()
