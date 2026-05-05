"""
Shared pytest fixtures for backend tests.
"""

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

from app.main import app
from app.database import Base, get_db
from app.models.base import User
from app.core.security import hash_password
from app.core.redis import get_redis


class _FakePipeline:
    async def execute(self):
        # RateLimiter reads results[2] as the count — return 0 so we never hit
        # the limit in tests. Other indices are unused.
        return [0, 0, 0, 0]

    def __getattr__(self, _name):
        # zadd / zremrangebyscore / zcard / expire / etc. all chain on the pipeline.
        return lambda *args, **kwargs: self


class _FakeRedis:
    def pipeline(self):
        return _FakePipeline()

    async def get(self, _key):
        return None

    async def set(self, *args, **kwargs):
        return True

    async def delete(self, *args, **kwargs):
        return 0

    async def aclose(self):
        return None


_fake_redis = _FakeRedis()


async def _override_get_redis():
    return _fake_redis

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest_asyncio.fixture(scope="function")
async def test_app():
    engine = create_async_engine(
        TEST_DATABASE_URL,
        connect_args={"check_same_thread": False},
        echo=False,
    )
    TestSessionLocal = async_sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    test_session = TestSessionLocal()

    async def override_get_db():
        try:
            yield test_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_redis] = _override_get_redis
    yield app

    app.dependency_overrides.pop(get_db, None)
    app.dependency_overrides.pop(get_redis, None)
    await test_session.close()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest_asyncio.fixture(scope="function")
async def db_session(test_app):
    override = test_app.dependency_overrides[get_db]
    gen = override()
    session = await gen.__anext__()
    yield session
    await session.flush()


@pytest_asyncio.fixture(scope="function")
async def async_client(test_app):
    async with AsyncClient(
        transport=ASGITransport(app=test_app),
        base_url="http://test",
    ) as client:
        yield client


@pytest_asyncio.fixture(scope="function")
def make_auth_headers(db_session, async_client):
    async def _factory(role: str) -> dict:
        phone = f"09{role[:6].ljust(8, '0')}"
        password = "testpassword123"
        user = User(
            phone=phone,
            username=f"Test {role.capitalize()}",
            hashed_password=hash_password(password),
            role=role,
            is_active=True,
        )
        db_session.add(user)
        await db_session.flush()

        response = await async_client.post(
            "/api/v1/auth/login",
            json={"username": phone, "password": password},
        )
        assert response.status_code == 200, (
            f"Login failed for role={role!r}: {response.status_code} {response.text}"
        )
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}

    return _factory
