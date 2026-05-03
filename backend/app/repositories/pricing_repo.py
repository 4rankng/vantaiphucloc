from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.domain import Pricing, PricingLine
from app.repositories.base import BaseRepository


class PricingRepository(BaseRepository[Pricing]):
    def __init__(self, session: AsyncSession):
        super().__init__(Pricing, session)

    async def get_lines(self, pricing_id: int) -> list[PricingLine]:
        result = await self.session.execute(
            select(PricingLine).where(PricingLine.pricing_id == pricing_id)
        )
        return list(result.scalars().all())

    async def list_by_client(self, client_id: int) -> list[Pricing]:
        result = await self.session.execute(
            select(Pricing).where(Pricing.client_id == client_id)
        )
        return list(result.scalars().all())
