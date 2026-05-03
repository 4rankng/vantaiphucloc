from collections import defaultdict

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

    async def batch_load_containers(
        self, trip_order_ids: list[int]
    ) -> dict[int, list[TripOrderContainer]]:
        if not trip_order_ids:
            return {}
        result = await self.session.execute(
            select(TripOrderContainer).where(
                TripOrderContainer.trip_order_id.in_(trip_order_ids)
            )
        )
        mapping: dict[int, list[TripOrderContainer]] = defaultdict(list)
        for c in result.scalars():
            mapping[c.trip_order_id].append(c)
        return mapping

    async def get_matched_work_order_ids(self, trip_order_id: int) -> list[int]:
        result = await self.session.execute(
            select(TripOrderWorkOrder.work_order_id).where(
                TripOrderWorkOrder.trip_order_id == trip_order_id
            )
        )
        return [row[0] for row in result.all()]

    async def batch_load_matched_ids(
        self, trip_order_ids: list[int]
    ) -> dict[int, list[int]]:
        if not trip_order_ids:
            return {}
        result = await self.session.execute(
            select(
                TripOrderWorkOrder.trip_order_id,
                TripOrderWorkOrder.work_order_id,
            ).where(TripOrderWorkOrder.trip_order_id.in_(trip_order_ids))
        )
        mapping: dict[int, list[int]] = defaultdict(list)
        for row in result.all():
            mapping[row[0]].append(row[1])
        return mapping

    async def find_by_code(self, code: str) -> TripOrder | None:
        return await self.find_one(code=code)
