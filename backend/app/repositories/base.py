from typing import TypeVar, Generic, Type, Sequence

from fastapi import HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

ModelType = TypeVar("ModelType")


class BaseRepository(Generic[ModelType]):
    """Generic async CRUD repository.

    Does NOT commit — the caller (route handler or get_db) owns the transaction.
    Only flushes so the ORM assigns IDs and audit events can fire.
    """

    def __init__(self, model: Type[ModelType], session: AsyncSession):
        self.model = model
        self.session = session

    async def get_by_id(self, id: int) -> ModelType | None:
        result = await self.session.execute(
            select(self.model).where(self.model.id == id)
        )
        return result.scalar_one_or_none()

    async def get_by_id_or_404(self, id: int) -> ModelType:
        obj = await self.get_by_id(id)
        if obj is None:
            raise HTTPException(status_code=404, detail=f"{self.model.__name__} not found")
        return obj

    async def list_all(
        self,
        *,
        offset: int = 0,
        limit: int = 50,
        filters: dict | None = None,
        order_by=None,
    ) -> Sequence[ModelType]:
        query = select(self.model)
        if filters:
            for key, value in filters.items():
                if hasattr(self.model, key):
                    query = query.where(getattr(self.model, key) == value)
        if order_by is not None:
            query = query.order_by(order_by)
        query = query.offset(offset).limit(limit)
        result = await self.session.execute(query)
        return result.scalars().all()

    async def list_active(
        self,
        *,
        offset: int = 0,
        limit: int = 50,
        order_by=None,
        extra_filters: dict | None = None,
    ) -> Sequence[ModelType]:
        query = select(self.model).where(self.model.is_active == True)  # noqa: E712
        if extra_filters:
            for key, value in extra_filters.items():
                if hasattr(self.model, key):
                    query = query.where(getattr(self.model, key) == value)
        if order_by is not None:
            query = query.order_by(order_by)
        query = query.offset(offset).limit(limit)
        result = await self.session.execute(query)
        return result.scalars().all()

    async def count(self, *, filters: dict | None = None) -> int:
        query = select(func.count(self.model.id))
        if filters:
            for key, value in filters.items():
                if hasattr(self.model, key):
                    query = query.where(getattr(self.model, key) == value)
        result = await self.session.execute(query)
        return result.scalar() or 0

    async def count_active(self, *, filters: dict | None = None) -> int:
        query = select(func.count(self.model.id)).where(self.model.is_active == True)  # noqa: E712
        if filters:
            for key, value in filters.items():
                if hasattr(self.model, key):
                    query = query.where(getattr(self.model, key) == value)
        result = await self.session.execute(query)
        return result.scalar() or 0

    async def paginate(
        self,
        page: int = 1,
        page_size: int = 50,
        *,
        active_only: bool = False,
        filters: dict | None = None,
        order_by=None,
    ) -> tuple[Sequence[ModelType], int]:
        if active_only:
            total = await self.count_active(filters=filters)
            items = await self.list_active(
                offset=(page - 1) * page_size,
                limit=page_size,
                order_by=order_by,
                extra_filters=filters,
            )
        else:
            total = await self.count(filters=filters)
            items = await self.list_all(
                offset=(page - 1) * page_size,
                limit=page_size,
                filters=filters,
                order_by=order_by,
            )
        return items, total

    async def create(self, **kwargs) -> ModelType:
        obj = self.model(**kwargs)
        self.session.add(obj)
        await self.session.flush()
        return obj

    async def update(self, obj: ModelType, **kwargs) -> ModelType:
        for field, value in kwargs.items():
            setattr(obj, field, value)
        await self.session.flush()
        return obj

    async def soft_delete(self, obj: ModelType) -> None:
        obj.is_active = False  # type: ignore[attr-defined]
        await self.session.flush()

    async def exists(self, **filters) -> bool:
        query = select(func.count(self.model.id))
        for key, value in filters.items():
            query = query.where(getattr(self.model, key) == value)
        result = await self.session.execute(query)
        return (result.scalar() or 0) > 0

    async def find_one(self, **filters) -> ModelType | None:
        query = select(self.model)
        for key, value in filters.items():
            query = query.where(getattr(self.model, key) == value)
        result = await self.session.execute(query.limit(1))
        return result.scalar_one_or_none()
