from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.domain import SalaryPeriod, SalaryPeriodConfig
from app.repositories.base import BaseRepository


class SalaryPeriodRepository(BaseRepository[SalaryPeriod]):
    def __init__(self, session: AsyncSession):
        super().__init__(SalaryPeriod, session)

    async def find_by_driver_and_dates(
        self, driver_id: int, start_date, end_date
    ) -> SalaryPeriod | None:
        result = await self.session.execute(
            select(SalaryPeriod).where(
                SalaryPeriod.driver_id == driver_id,
                SalaryPeriod.start_date == start_date,
                SalaryPeriod.end_date == end_date,
            )
        )
        return result.scalar_one_or_none()


class SalaryPeriodConfigRepository(BaseRepository[SalaryPeriodConfig]):
    def __init__(self, session: AsyncSession):
        super().__init__(SalaryPeriodConfig, session)

    async def get_current(self) -> SalaryPeriodConfig | None:
        result = await self.session.execute(
            select(SalaryPeriodConfig).limit(1)
        )
        return result.scalar_one_or_none()
