"""
Shared pytest fixtures for backend integration tests.

Validates: Requirements 1.2
"""

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

from app.main import app
from app.database import Base, get_db
from app.models.base import User
from app.models.domain import Company
from app.core.security import hash_password

# ---------------------------------------------------------------------------
# In-memory SQLite engine (shared across fixtures in a test session)
# ---------------------------------------------------------------------------

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest_asyncio.fixture(scope="function")
async def test_app():
    """
    Create a fresh in-memory SQLite database for each test function.

    - Creates all tables via Base.metadata.create_all (using run_sync)
    - Overrides the FastAPI `get_db` dependency to use the test session
    - Yields the configured app
    - Drops all tables after the test completes
    """
    engine = create_async_engine(
        TEST_DATABASE_URL,
        connect_args={"check_same_thread": False},
        echo=False,
    )

    TestSessionLocal = async_sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )

    # Create all tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Keep a single session instance so test data inserted before the request
    # is visible during the request (same connection/transaction).
    test_session = TestSessionLocal()

    async def override_get_db():
        try:
            yield test_session
        finally:
            pass  # session is closed in the fixture teardown

    app.dependency_overrides[get_db] = override_get_db

    yield app

    # Teardown
    app.dependency_overrides.pop(get_db, None)
    await test_session.close()

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    await engine.dispose()


@pytest_asyncio.fixture(scope="function")
async def db_session(test_app):
    """
    Provide the test AsyncSession directly for inserting test data.

    Retrieves the session from the overridden `get_db` dependency so that
    data inserted here is visible to the request handler.
    """
    # Pull the session out of the override
    override = test_app.dependency_overrides[get_db]
    gen = override()
    session = await gen.__anext__()
    yield session
    # Flush any pending state so subsequent queries see the data
    await session.flush()


@pytest_asyncio.fixture(scope="function")
async def async_client(test_app):
    """
    An httpx.AsyncClient wired to the test FastAPI app via ASGITransport.
    """
    async with AsyncClient(
        transport=ASGITransport(app=test_app),
        base_url="http://test",
    ) as client:
        yield client


@pytest_asyncio.fixture(scope="function")
async def company(db_session):
    """
    Insert a test Company row and return it.
    """
    c = Company(name="Test Company")
    db_session.add(c)
    await db_session.flush()
    await db_session.refresh(c)
    return c


@pytest_asyncio.fixture(scope="function")
def make_auth_headers(db_session, async_client, company):
    """
    Async fixture factory.

    Usage::

        headers = await make_auth_headers("accountant")

    Creates a User with the given role, logs in via the real JWT endpoint,
    and returns ``{"Authorization": "Bearer <token>"}``.
    """

    async def _factory(role: str) -> dict:
        phone = f"09{role[:6].ljust(8, '0')}"  # deterministic test phone per role
        password = "testpassword123"

        user = User(
            phone=phone,
            username=f"Test {role.capitalize()}",
            hashed_password=hash_password(password),
            role=role,
            company_id=company.id,
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
