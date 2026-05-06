import logging
from contextlib import asynccontextmanager

from sqlalchemy import event
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

from app.config import settings

logger = logging.getLogger(__name__)

engine = create_async_engine(
    settings.DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://"),
    echo=False,
    pool_size=settings.DB_POOL_SIZE,
    max_overflow=settings.DB_MAX_OVERFLOW,
    pool_timeout=settings.DB_POOL_TIMEOUT,
    pool_recycle=settings.DB_POOL_RECYCLE,
    pool_pre_ping=True,
)

logger.info(
    "DB pool: size=%d overflow=%d timeout=%ds recycle=%ds",
    settings.DB_POOL_SIZE, settings.DB_MAX_OVERFLOW,
    settings.DB_POOL_TIMEOUT, settings.DB_POOL_RECYCLE,
)


@event.listens_for(engine.sync_engine, "connect")
def _on_connect(dbapi_conn, connection_record):
    logger.debug("DB pool: new connection created")


async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


@asynccontextmanager
async def get_session():
    """Context manager for worker tasks — auto-commits on success."""
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
