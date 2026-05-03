from sqlalchemy.ext.asyncio import AsyncSession

from app.models.domain import Location
from app.repositories.base import BaseRepository


class LocationRepository(BaseRepository[Location]):
    def __init__(self, session: AsyncSession):
        super().__init__(Location, session)

    async def find_by_name(self, name: str) -> Location | None:
        return await self.find_one(name=name)
