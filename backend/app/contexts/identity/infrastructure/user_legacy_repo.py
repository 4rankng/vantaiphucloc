from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.base import User
from app.core.base_repository import BaseRepository


class UserRepository(BaseRepository[User]):
    def __init__(self, session: AsyncSession):
        super().__init__(User, session)

    async def find_by_phone(self, phone: str) -> User | None:
        return await self.find_one(phone=phone)

    async def find_by_email(self, email: str) -> User | None:
        return await self.find_one(email=email)

    async def find_by_username(self, username: str) -> User | None:
        return await self.find_one(username=username)

    async def find_by_identifier(self, identifier: str) -> User | None:
        """Look up user by phone, email, or username."""
        result = await self.session.execute(
            select(User).where(
                (User.phone == identifier) | (User.email == identifier) | (User.username == identifier)
            )
        )
        return result.scalar_one_or_none()
