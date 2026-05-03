from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.domain import WorkOrder, WorkOrderContainer
from app.repositories.base import BaseRepository


class WorkOrderRepository(BaseRepository[WorkOrder]):
    def __init__(self, session: AsyncSession):
        super().__init__(WorkOrder, session)

    async def get_containers(self, work_order_id: int) -> list[WorkOrderContainer]:
        result = await self.session.execute(
            select(WorkOrderContainer).where(WorkOrderContainer.work_order_id == work_order_id)
        )
        return list(result.scalars().all())

    async def find_by_code(self, code: str) -> WorkOrder | None:
        return await self.find_one(code=code)
