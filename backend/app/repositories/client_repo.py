from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.domain import Client, WorkOrder, TripOrder
from app.repositories.base import BaseRepository


class ClientRepository(BaseRepository[Client]):
    def __init__(self, session: AsyncSession):
        super().__init__(Client, session)

    async def find_by_code(self, code: str) -> Client | None:
        return await self.find_one(code=code)

    async def has_work_orders(self, client_id: int) -> bool:
        result = await self.session.execute(
            select(func.count(WorkOrder.id)).where(WorkOrder.client_id == client_id)
        )
        return (result.scalar() or 0) > 0

    async def has_trip_orders(self, client_id: int) -> bool:
        result = await self.session.execute(
            select(func.count(TripOrder.id)).where(TripOrder.client_id == client_id)
        )
        return (result.scalar() or 0) > 0
