from sqlalchemy.ext.asyncio import AsyncSession

from app.models.domain import Route
from app.repositories.base import BaseRepository


class RouteRepository(BaseRepository[Route]):
    def __init__(self, session: AsyncSession):
        super().__init__(Route, session)
