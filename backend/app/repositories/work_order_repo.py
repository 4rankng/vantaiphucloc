from collections import defaultdict

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.domain import WorkOrder, WorkOrderContainer
from app.models.enums import WorkOrderStatus
from app.repositories.base import BaseRepository


class WorkOrderRepository(BaseRepository[WorkOrder]):
    def __init__(self, session: AsyncSession):
        super().__init__(WorkOrder, session)

    async def get_containers(self, work_order_id: int) -> list[WorkOrderContainer]:
        result = await self.session.execute(
            select(WorkOrderContainer).where(WorkOrderContainer.work_order_id == work_order_id)
        )
        return list(result.scalars().all())

    async def batch_load_containers(
        self, work_order_ids: list[int]
    ) -> dict[int, list[WorkOrderContainer]]:
        if not work_order_ids:
            return {}
        result = await self.session.execute(
            select(WorkOrderContainer).where(
                WorkOrderContainer.work_order_id.in_(work_order_ids)
            )
        )
        mapping: dict[int, list[WorkOrderContainer]] = defaultdict(list)
        for c in result.scalars():
            mapping[c.work_order_id].append(c)
        return mapping

    async def set_status_bulk(
        self, work_order_ids: list[int], status: WorkOrderStatus
    ) -> None:
        """Set the same status on multiple WorkOrders. No commit — caller owns the transaction."""
        if not work_order_ids:
            return
        result = await self.session.execute(
            select(WorkOrder).where(WorkOrder.id.in_(work_order_ids))
        )
        for wo in result.scalars():
            wo.status = status

    async def find_by_code(self, code: str) -> WorkOrder | None:
        return await self.find_one(code=code)
