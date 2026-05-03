from sqlalchemy.ext.asyncio import AsyncSession

from app.models.domain import Vendor
from app.repositories.base import BaseRepository


class VendorRepository(BaseRepository[Vendor]):
    def __init__(self, session: AsyncSession):
        super().__init__(Vendor, session)
