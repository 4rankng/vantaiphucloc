from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.domain import TripOrder, TripOrderContainer, TripOrderWorkOrder
from app.repositories.base import BaseRepository


class TripOrderRepository(BaseRepository[TripOrder]):
    def __init__(self, session: AsyncSession):
        super().__init__(TripOrder, session)

    async def get_containers(self, trip_order_id: int) -> list[TripOrderContainer]:
        result = await self.session.execute(
            select(TripOrderContainer).where(TripOrderContainer.trip_order_id == trip_order_id)
        )
        return list(result.scalars().all())

    async def get_matched_work_order_ids(self, trip_order_id: int) -> list[int]:
        result = await self.session.execute(
            select(TripOrderWorkOrder.work_order_id).where(
                TripOrderWorkOrder.trip_order_id == trip_order_id
            )
        )
        return [row[0] for row in result.all()]

    async def find_by_code(self, code: str) -> TripOrder | None:
        return await self.find_one(code=code)
