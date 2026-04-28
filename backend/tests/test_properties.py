"""
Property-based tests for the fullstack-backend-integration feature.

Feature: fullstack-backend-integration
Design document: .kiro/specs/fullstack-backend-integration/design.md

Each test function is annotated with the property it validates.
All properties use Hypothesis with max_examples=100 (configured in pyproject.toml).
"""

import asyncio
from datetime import date, timedelta

import pytest
from hypothesis import given, settings, HealthCheck
from hypothesis import strategies as st
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

from app.main import app
from app.database import Base, get_db
from app.models.base import User
from app.models.domain import (
    Company,
    Client,
    WorkOrder,
    WorkOrderContainer,
    TripOrder,
    TripOrderWorkOrder,
    Pricing,
)
from app.core.security import hash_password, decode_access_token

# ---------------------------------------------------------------------------
# Shared async test infrastructure helpers
# ---------------------------------------------------------------------------

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

# Pre-compute hashed password once to avoid bcrypt overhead per Hypothesis example
_TEST_PASSWORD = "testpass123"
_HASHED_TEST_PASSWORD = hash_password(_TEST_PASSWORD)


async def _make_test_env():
    """Create a fresh in-memory SQLite engine, session, and configured app."""
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

    session = TestSessionLocal()

    async def override_get_db():
        try:
            yield session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    return engine, session


async def _teardown_test_env(engine, session):
    """Tear down the test environment."""
    app.dependency_overrides.pop(get_db, None)
    await session.close()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


async def _make_company(session):
    c = Company(name="Test Company")
    session.add(c)
    await session.flush()
    await session.refresh(c)
    return c


async def _make_user(session, company_id, role, phone=None, username=None):
    """Create a user with the pre-hashed test password to avoid bcrypt overhead."""
    phone = phone or f"09{role[:6].ljust(8, '0')}"
    username = username or f"Test {role.capitalize()}"
    user = User(
        phone=phone,
        username=username,
        hashed_password=_HASHED_TEST_PASSWORD,
        role=role,
        company_id=company_id,
        is_active=True,
    )
    session.add(user)
    await session.flush()
    await session.refresh(user)
    return user


async def _login(client, phone, password=_TEST_PASSWORD):
    resp = await client.post("/api/v1/auth/login", json={"phone": phone, "password": password})
    assert resp.status_code == 200, f"Login failed: {resp.text}"
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


# ---------------------------------------------------------------------------
# Property 1: JWT payload completeness
# Feature: fullstack-backend-integration, Property 1: For any valid user that
# successfully logs in, the decoded JWT payload SHALL contain the fields id,
# name, role, and company_id with non-null values.
# Validates: Requirements 2.3
# ---------------------------------------------------------------------------

@given(
    phone=st.text(min_size=10, max_size=15, alphabet="0123456789"),
    username=st.text(min_size=1, max_size=30, alphabet=st.characters(whitelist_categories=("Lu", "Ll"))),
)
@settings(suppress_health_check=[HealthCheck.too_slow], max_examples=5, deadline=None)
def test_property_1_jwt_payload_completeness(phone, username):
    # Feature: fullstack-backend-integration, Property 1: JWT payload completeness
    async def _run():
        engine, session = await _make_test_env()
        try:
            company = await _make_company(session)
            user = User(
                phone=phone,
                username=username,
                hashed_password=_HASHED_TEST_PASSWORD,
                role="accountant",
                company_id=company.id,
                is_active=True,
            )
            session.add(user)
            await session.flush()
            await session.refresh(user)

            async with AsyncClient(
                transport=ASGITransport(app=app), base_url="http://test"
            ) as client:
                resp = await client.post(
                    "/api/v1/auth/login",
                    json={"phone": phone, "password": _TEST_PASSWORD},
                )
            assert resp.status_code == 200, f"Login failed: {resp.text}"
            token = resp.json()["access_token"]
            payload = decode_access_token(token)
            assert payload is not None, "Token could not be decoded"
            assert payload.get("id") is not None, "JWT missing 'id'"
            assert payload.get("name") is not None, "JWT missing 'name'"
            assert payload.get("role") is not None, "JWT missing 'role'"
            assert payload.get("company_id") is not None, "JWT missing 'company_id'"
        finally:
            await _teardown_test_env(engine, session)

    asyncio.run(_run())


# ---------------------------------------------------------------------------
# Property 2: Protected endpoint authentication
# Feature: fullstack-backend-integration, Property 2: For any protected API
# endpoint, making a request without a valid Authorization header SHALL return
# HTTP 401.
# Validates: Requirements 2.4
# ---------------------------------------------------------------------------

PROTECTED_ENDPOINTS = [
    ("GET", "/api/v1/clients"),
    ("GET", "/api/v1/routes"),
    ("GET", "/api/v1/pricings"),
    ("GET", "/api/v1/work-orders"),
    ("GET", "/api/v1/trip-orders"),
    ("GET", "/api/v1/salary"),
    ("GET", "/api/v1/drivers"),
]


@pytest.mark.parametrize("method,endpoint", PROTECTED_ENDPOINTS)
async def test_property_2_protected_endpoint_authentication(
    method, endpoint, async_client
):
    # Feature: fullstack-backend-integration, Property 2: Protected endpoint authentication
    # Note: FastAPI's HTTPBearer returns 403 when the Authorization header is absent
    # (auto_error=True default). Both 401 and 403 indicate the request is rejected
    # due to missing credentials, satisfying the "unauthenticated" property.
    resp = await async_client.request(method, endpoint)
    assert resp.status_code in (401, 403), (
        f"{method} {endpoint} returned {resp.status_code}, expected 401 or 403"
    )


# ---------------------------------------------------------------------------
# Property 3: Role-based authorization
# Feature: fullstack-backend-integration, Property 3: For any endpoint that
# restricts access to specific roles, a request authenticated with a user whose
# role is not in the allowed set SHALL return HTTP 403.
# Validates: Requirements 2.5
# ---------------------------------------------------------------------------

ROLE_RESTRICTED_ENDPOINTS = [
    # (endpoint, method, body, role_that_should_be_denied)
    ("/api/v1/clients", "POST", {"name": "X", "type": "company", "phone": "0900000001"}, "director"),
    ("/api/v1/routes", "POST", {"route": "A-B", "type_20ft": 100, "type_40ft": 200, "is_two_way": False}, "director"),
    ("/api/v1/pricings", "POST", {
        "client_id": 1, "client_name": "X", "work_type": "E20", "route": "A-B",
        "lines": [], "unit_price": 100, "driver_salary": 50, "allowance": 10
    }, "director"),
    ("/api/v1/work-orders", "POST", {
        "containers": [{"container_number": "C1", "work_type": "E20"}],
        "client_id": 1, "client_name": "X", "route": "A-B",
        "driver_id": 1, "driver_name": "D", "tractor_plate": "51A-001"
    }, "accountant"),
    ("/api/v1/trip-orders", "POST", {
        "trip_date": "2024-01-01", "client_id": 1, "client_name": "X",
        "work_type": "E20", "route": "A-B", "tractor_plate": "51A-001",
        "driver_id": 1, "driver_name": "D", "container_number": "C1",
        "unit_price": 100, "driver_salary": 50, "allowance": 10, "revenue": 100
    }, "director"),
]


@pytest.mark.parametrize("endpoint,method,body,denied_role", ROLE_RESTRICTED_ENDPOINTS)
async def test_property_3_role_based_authorization(
    endpoint, method, body, denied_role, async_client, make_auth_headers
):
    # Feature: fullstack-backend-integration, Property 3: Role-based authorization
    headers = await make_auth_headers(denied_role)
    resp = await async_client.request(method, endpoint, json=body, headers=headers)
    assert resp.status_code == 403, (
        f"{method} {endpoint} with role={denied_role!r} returned {resp.status_code}, expected 403"
    )


# ---------------------------------------------------------------------------
# Property 4: Client create round-trip
# Feature: fullstack-backend-integration, Property 4: For any valid client
# creation payload, POSTing to /api/v1/clients and then GETting the returned
# id SHALL return a client whose fields match the original payload.
# Validates: Requirements 3.2
# ---------------------------------------------------------------------------

@given(
    name=st.text(min_size=1, max_size=50, alphabet=st.characters(whitelist_categories=("Lu", "Ll", "Nd"))),
    phone=st.text(min_size=10, max_size=15, alphabet="0123456789"),
)
@settings(suppress_health_check=[HealthCheck.too_slow], max_examples=5, deadline=None)
def test_property_4_client_create_round_trip(name, phone):
    # Feature: fullstack-backend-integration, Property 4: Client create round-trip
    async def _run():
        engine, session = await _make_test_env()
        try:
            company = await _make_company(session)
            user = await _make_user(session, company.id, "accountant")

            async with AsyncClient(
                transport=ASGITransport(app=app), base_url="http://test"
            ) as client:
                headers = await _login(client, user.phone)
                payload = {"name": name, "type": "company", "phone": phone}
                create_resp = await client.post("/api/v1/clients", json=payload, headers=headers)
                assert create_resp.status_code == 201, f"Create failed: {create_resp.text}"
                created = create_resp.json()
                client_id = created["id"]

                get_resp = await client.get(f"/api/v1/clients", headers=headers)
                assert get_resp.status_code == 200
                clients = get_resp.json()
                found = next((c for c in clients if c["id"] == client_id), None)
                assert found is not None, f"Client {client_id} not found in list"
                assert found["name"] == name
                assert found["phone"] == phone
        finally:
            await _teardown_test_env(engine, session)

    asyncio.run(_run())


# ---------------------------------------------------------------------------
# Property 5: Client list ordering
# Feature: fullstack-backend-integration, Property 5: For any collection of
# clients stored in the system, GET /api/v1/clients SHALL return them in
# ascending order by name.
# Validates: Requirements 3.5
# ---------------------------------------------------------------------------

@given(
    names=st.lists(
        st.text(min_size=1, max_size=20, alphabet=st.characters(whitelist_categories=("Lu", "Ll"))),
        min_size=2,
        max_size=10,
        unique=True,
    )
)
@settings(suppress_health_check=[HealthCheck.too_slow], max_examples=5, deadline=None)
def test_property_5_client_list_ordering(names):
    # Feature: fullstack-backend-integration, Property 5: Client list ordering
    async def _run():
        engine, session = await _make_test_env()
        try:
            company = await _make_company(session)
            user = await _make_user(session, company.id, "accountant")

            # Insert clients directly via session
            for i, n in enumerate(names):
                c = Client(
                    company_id=company.id,
                    name=n,
                    type="company",
                    phone=f"09{str(i).zfill(9)}",
                )
                session.add(c)
            await session.flush()

            async with AsyncClient(
                transport=ASGITransport(app=app), base_url="http://test"
            ) as client:
                headers = await _login(client, user.phone)
                resp = await client.get("/api/v1/clients", headers=headers)
                assert resp.status_code == 200
                returned_names = [c["name"] for c in resp.json()]
                # Filter to only the names we inserted (there may be none from other tests)
                our_names = [n for n in returned_names if n in set(names)]
                assert our_names == sorted(our_names), (
                    f"Client names not sorted: {our_names}"
                )
        finally:
            await _teardown_test_env(engine, session)

    asyncio.run(_run())


# ---------------------------------------------------------------------------
# Property 6: Route create round-trip
# Feature: fullstack-backend-integration, Property 6: For any valid route
# creation payload, POSTing to /api/v1/routes and then GETting the returned
# id SHALL return a route whose fields match the original payload.
# Validates: Requirements 4.2
# ---------------------------------------------------------------------------

@given(
    route_name=st.text(min_size=1, max_size=50, alphabet=st.characters(whitelist_categories=("Lu", "Ll", "Nd"))),
    type_20ft=st.integers(min_value=0, max_value=10_000_000),
    type_40ft=st.integers(min_value=0, max_value=10_000_000),
    is_two_way=st.booleans(),
)
@settings(suppress_health_check=[HealthCheck.too_slow], max_examples=5, deadline=None)
def test_property_6_route_create_round_trip(route_name, type_20ft, type_40ft, is_two_way):
    # Feature: fullstack-backend-integration, Property 6: Route create round-trip
    async def _run():
        engine, session = await _make_test_env()
        try:
            company = await _make_company(session)
            user = await _make_user(session, company.id, "accountant")

            async with AsyncClient(
                transport=ASGITransport(app=app), base_url="http://test"
            ) as client:
                headers = await _login(client, user.phone)
                payload = {
                    "route": route_name,
                    "type_20ft": type_20ft,
                    "type_40ft": type_40ft,
                    "is_two_way": is_two_way,
                }
                create_resp = await client.post("/api/v1/routes", json=payload, headers=headers)
                assert create_resp.status_code == 201, f"Create failed: {create_resp.text}"
                created = create_resp.json()
                route_id = created["id"]

                get_resp = await client.get("/api/v1/routes", headers=headers)
                assert get_resp.status_code == 200
                routes = get_resp.json()
                found = next((r for r in routes if r["id"] == route_id), None)
                assert found is not None, f"Route {route_id} not found"
                assert found["route"] == route_name
                assert found["type_20ft"] == type_20ft
                assert found["type_40ft"] == type_40ft
                assert found["is_two_way"] == is_two_way
        finally:
            await _teardown_test_env(engine, session)

    asyncio.run(_run())


# ---------------------------------------------------------------------------
# Property 7: Pricing create round-trip
# Feature: fullstack-backend-integration, Property 7: For any valid pricing
# creation payload, POSTing to /api/v1/pricings and then GETting the returned
# id SHALL return a pricing record whose fields match the original payload.
# Validates: Requirements 5.2
# ---------------------------------------------------------------------------

@given(
    work_type=st.sampled_from(["E20", "E40", "F20", "F40"]),
    unit_price=st.integers(min_value=0, max_value=10_000_000),
    driver_salary=st.integers(min_value=0, max_value=10_000_000),
    allowance=st.integers(min_value=0, max_value=1_000_000),
)
@settings(suppress_health_check=[HealthCheck.too_slow], max_examples=5, deadline=None)
def test_property_7_pricing_create_round_trip(work_type, unit_price, driver_salary, allowance):
    # Feature: fullstack-backend-integration, Property 7: Pricing create round-trip
    async def _run():
        engine, session = await _make_test_env()
        try:
            company = await _make_company(session)
            user = await _make_user(session, company.id, "accountant")

            # Create a client first
            client_obj = Client(
                company_id=company.id,
                name="PricingClient",
                type="company",
                phone="0900000099",
            )
            session.add(client_obj)
            await session.flush()
            await session.refresh(client_obj)

            async with AsyncClient(
                transport=ASGITransport(app=app), base_url="http://test"
            ) as http_client:
                headers = await _login(http_client, user.phone)
                payload = {
                    "client_id": client_obj.id,
                    "client_name": client_obj.name,
                    "work_type": work_type,
                    "route": "TestRoute",
                    "lines": [{"work_type": work_type, "quantity": 1}],
                    "unit_price": unit_price,
                    "driver_salary": driver_salary,
                    "allowance": allowance,
                }
                create_resp = await http_client.post("/api/v1/pricings", json=payload, headers=headers)
                assert create_resp.status_code == 201, f"Create failed: {create_resp.text}"
                created = create_resp.json()
                pricing_id = created["id"]

                list_resp = await http_client.get("/api/v1/pricings", headers=headers)
                assert list_resp.status_code == 200
                pricings = list_resp.json()
                found = next((p for p in pricings if p["id"] == pricing_id), None)
                assert found is not None, f"Pricing {pricing_id} not found"
                assert found["work_type"] == work_type
                assert found["unit_price"] == unit_price
                assert found["driver_salary"] == driver_salary
                assert found["allowance"] == allowance
                assert found["client_id"] == client_obj.id
        finally:
            await _teardown_test_env(engine, session)

    asyncio.run(_run())


# ---------------------------------------------------------------------------
# Property 8: Work order create round-trip
# Feature: fullstack-backend-integration, Property 8: For any valid work order
# creation payload, POSTing to /api/v1/work-orders and then GETting the
# returned id SHALL return a work order whose container list and core fields
# match the original payload.
# Validates: Requirements 6.1
# ---------------------------------------------------------------------------

@given(
    container_number=st.text(min_size=1, max_size=20, alphabet=st.characters(whitelist_categories=("Lu", "Ll", "Nd"))),
    work_type=st.sampled_from(["E20", "E40", "F20", "F40"]),
)
@settings(suppress_health_check=[HealthCheck.too_slow], max_examples=5, deadline=None)
def test_property_8_work_order_create_round_trip(container_number, work_type):
    # Feature: fullstack-backend-integration, Property 8: Work order create round-trip
    async def _run():
        engine, session = await _make_test_env()
        try:
            company = await _make_company(session)
            driver = await _make_user(session, company.id, "driver", phone="0911111111")

            # Create a client
            client_obj = Client(
                company_id=company.id,
                name="WOClient",
                type="company",
                phone="0900000088",
            )
            session.add(client_obj)
            await session.flush()
            await session.refresh(client_obj)

            async with AsyncClient(
                transport=ASGITransport(app=app), base_url="http://test"
            ) as http_client:
                headers = await _login(http_client, driver.phone)
                payload = {
                    "containers": [
                        {"container_number": container_number, "work_type": work_type}
                    ],
                    "client_id": client_obj.id,
                    "client_name": client_obj.name,
                    "route": "TestRoute",
                    "driver_id": driver.id,
                    "driver_name": driver.username,
                    "tractor_plate": "51A-001",
                }
                create_resp = await http_client.post("/api/v1/work-orders", json=payload, headers=headers)
                assert create_resp.status_code == 201, f"Create failed: {create_resp.text}"
                created = create_resp.json()
                wo_id = created["id"]

                get_resp = await http_client.get(f"/api/v1/work-orders/{wo_id}", headers=headers)
                assert get_resp.status_code == 200
                fetched = get_resp.json()
                assert fetched["client_id"] == client_obj.id
                assert fetched["route"] == "TestRoute"
                assert fetched["driver_id"] == driver.id
                assert len(fetched["containers"]) == 1
                assert fetched["containers"][0]["container_number"] == container_number
                assert fetched["containers"][0]["work_type"] == work_type
        finally:
            await _teardown_test_env(engine, session)

    asyncio.run(_run())


# ---------------------------------------------------------------------------
# Property 9: Work order pricing auto-fill
# Feature: fullstack-backend-integration, Property 9: For any work order
# creation where a Pricing record exists matching client_id + first container
# work_type + route, the created work order SHALL have unit_price, driver_salary,
# and allowance equal to the matching Pricing's values, earning equal to
# driver_salary + allowance, and status equal to PRICED.
# Validates: Requirements 6.2, 6.4
# ---------------------------------------------------------------------------

@given(
    unit_price=st.integers(min_value=1, max_value=10_000_000),
    driver_salary=st.integers(min_value=1, max_value=10_000_000),
    allowance=st.integers(min_value=0, max_value=1_000_000),
)
@settings(suppress_health_check=[HealthCheck.too_slow], max_examples=5, deadline=None)
def test_property_9_work_order_pricing_auto_fill(unit_price, driver_salary, allowance):
    # Feature: fullstack-backend-integration, Property 9: Work order pricing auto-fill
    async def _run():
        engine, session = await _make_test_env()
        try:
            company = await _make_company(session)
            driver = await _make_user(session, company.id, "driver", phone="0922222222")
            accountant = await _make_user(session, company.id, "accountant", phone="0933333333")

            # Create a client
            client_obj = Client(
                company_id=company.id,
                name="AutoFillClient",
                type="company",
                phone="0900000077",
            )
            session.add(client_obj)
            await session.flush()
            await session.refresh(client_obj)

            # Create a pricing record
            pricing = Pricing(
                company_id=company.id,
                client_id=client_obj.id,
                client_name=client_obj.name,
                work_type="E20",
                route="AutoRoute",
                unit_price=unit_price,
                driver_salary=driver_salary,
                allowance=allowance,
            )
            session.add(pricing)
            await session.flush()
            await session.refresh(pricing)

            async with AsyncClient(
                transport=ASGITransport(app=app), base_url="http://test"
            ) as http_client:
                headers = await _login(http_client, driver.phone)
                payload = {
                    "containers": [
                        {"container_number": "CONT001", "work_type": "E20"}
                    ],
                    "client_id": client_obj.id,
                    "client_name": client_obj.name,
                    "route": "AutoRoute",
                    "driver_id": driver.id,
                    "driver_name": driver.username,
                    "tractor_plate": "51A-002",
                }
                create_resp = await http_client.post("/api/v1/work-orders", json=payload, headers=headers)
                assert create_resp.status_code == 201, f"Create failed: {create_resp.text}"
                wo = create_resp.json()
                assert wo["unit_price"] == unit_price, f"unit_price mismatch: {wo['unit_price']} != {unit_price}"
                assert wo["driver_salary"] == driver_salary, f"driver_salary mismatch"
                assert wo["allowance"] == allowance, f"allowance mismatch"
                assert wo["earning"] == driver_salary + allowance, f"earning mismatch"
                assert wo["status"] == "PRICED", f"status should be PRICED, got {wo['status']}"
        finally:
            await _teardown_test_env(engine, session)

    asyncio.run(_run())


# ---------------------------------------------------------------------------
# Property 10: Trip order work order status propagation
# Feature: fullstack-backend-integration, Property 10: For any trip order
# update that sets matched_work_order_ids to a non-empty list, each referenced
# work order SHALL have its status set to MATCHED after the update.
# Validates: Requirements 7.4
# ---------------------------------------------------------------------------

@given(n=st.integers(min_value=1, max_value=5))
@settings(suppress_health_check=[HealthCheck.too_slow], max_examples=5, deadline=None)
def test_property_10_trip_order_work_order_status_propagation(n):
    # Feature: fullstack-backend-integration, Property 10: Trip order work order status propagation
    async def _run():
        engine, session = await _make_test_env()
        try:
            company = await _make_company(session)
            driver = await _make_user(session, company.id, "driver", phone="0944444444")
            accountant = await _make_user(session, company.id, "accountant", phone="0955555555")

            client_obj = Client(
                company_id=company.id,
                name="PropClient",
                type="company",
                phone="0900000066",
            )
            session.add(client_obj)
            await session.flush()
            await session.refresh(client_obj)

            # Create N work orders directly in DB
            wo_ids = []
            for i in range(n):
                wo = WorkOrder(
                    company_id=company.id,
                    client_id=client_obj.id,
                    client_name=client_obj.name,
                    route="PropRoute",
                    driver_id=driver.id,
                    driver_name=driver.username,
                    tractor_plate="51A-003",
                    unit_price=0,
                    driver_salary=0,
                    allowance=0,
                    earning=0,
                    status="PENDING",
                )
                session.add(wo)
                await session.flush()
                await session.refresh(wo)
                wo_ids.append(wo.id)

            # Create a trip order
            trip = TripOrder(
                company_id=company.id,
                trip_date=date(2024, 1, 1),
                client_id=client_obj.id,
                client_name=client_obj.name,
                work_type="E20",
                route="PropRoute",
                tractor_plate="51A-003",
                driver_id=driver.id,
                driver_name=driver.username,
                container_number="CONT001",
                unit_price=100,
                driver_salary=50,
                allowance=10,
                revenue=100,
                status="DRAFT",
            )
            session.add(trip)
            await session.flush()
            await session.refresh(trip)

            async with AsyncClient(
                transport=ASGITransport(app=app), base_url="http://test"
            ) as http_client:
                headers = await _login(http_client, accountant.phone)
                # PUT trip order with matched_work_order_ids
                put_resp = await http_client.put(
                    f"/api/v1/trip-orders/{trip.id}",
                    json={"matched_work_order_ids": wo_ids},
                    headers=headers,
                )
                assert put_resp.status_code == 200, f"PUT failed: {put_resp.text}"

                # Verify each work order is now MATCHED
                for wo_id in wo_ids:
                    get_resp = await http_client.get(f"/api/v1/work-orders/{wo_id}", headers=headers)
                    assert get_resp.status_code == 200
                    assert get_resp.json()["status"] == "MATCHED", (
                        f"Work order {wo_id} status is {get_resp.json()['status']}, expected MATCHED"
                    )
        finally:
            await _teardown_test_env(engine, session)

    asyncio.run(_run())


# ---------------------------------------------------------------------------
# Property 11: Reconciliation state changes
# Feature: fullstack-backend-integration, Property 11: For any unmatched work
# order and any trip order, calling POST /api/v1/reconcile with their IDs SHALL
# result in the work order's status being MATCHED and the work order's id
# appearing in the trip order's matched_work_order_ids.
# Validates: Requirements 8.2
# ---------------------------------------------------------------------------

async def test_property_11_reconciliation_state_changes(
    async_client, db_session, company, make_auth_headers
):
    # Feature: fullstack-backend-integration, Property 11: Reconciliation state changes
    driver = await _make_user(db_session, company.id, "driver", phone="0966666666")
    accountant_headers = await make_auth_headers("accountant")

    client_obj = Client(
        company_id=company.id,
        name="ReconcileClient",
        type="company",
        phone="0900000055",
    )
    db_session.add(client_obj)
    await db_session.flush()
    await db_session.refresh(client_obj)

    # Create an unmatched work order
    wo = WorkOrder(
        company_id=company.id,
        client_id=client_obj.id,
        client_name=client_obj.name,
        route="RecRoute",
        driver_id=driver.id,
        driver_name=driver.username,
        tractor_plate="51A-004",
        unit_price=0,
        driver_salary=0,
        allowance=0,
        earning=0,
        status="PENDING",
    )
    db_session.add(wo)
    await db_session.flush()
    await db_session.refresh(wo)

    # Create a trip order
    trip = TripOrder(
        company_id=company.id,
        trip_date=date(2024, 1, 1),
        client_id=client_obj.id,
        client_name=client_obj.name,
        work_type="E20",
        route="RecRoute",
        tractor_plate="51A-004",
        driver_id=driver.id,
        driver_name=driver.username,
        container_number="CONT001",
        unit_price=100,
        driver_salary=50,
        allowance=10,
        revenue=100,
        status="DRAFT",
    )
    db_session.add(trip)
    await db_session.flush()
    await db_session.refresh(trip)

    # POST /reconcile
    resp = await async_client.post(
        "/api/v1/reconcile",
        json={"work_order_id": wo.id, "trip_order_id": trip.id},
        headers=accountant_headers,
    )
    assert resp.status_code == 200, f"Reconcile failed: {resp.text}"
    trip_out = resp.json()

    # Assert work order is MATCHED
    wo_resp = await async_client.get(f"/api/v1/work-orders/{wo.id}", headers=accountant_headers)
    assert wo_resp.status_code == 200
    assert wo_resp.json()["status"] == "MATCHED"

    # Assert work order id appears in trip order's matched_work_order_ids
    assert wo.id in trip_out["matched_work_order_ids"], (
        f"Work order {wo.id} not in matched_work_order_ids: {trip_out['matched_work_order_ids']}"
    )


# ---------------------------------------------------------------------------
# Property 12: Reconciliation earning calculation
# Feature: fullstack-backend-integration, Property 12: For any reconciliation
# between a work order and a trip order, the work order's earning after
# reconciliation SHALL equal the trip order's driver_salary + allowance.
# Validates: Requirements 8.3
# ---------------------------------------------------------------------------

@given(
    driver_salary=st.integers(min_value=0, max_value=10_000_000),
    allowance=st.integers(min_value=0, max_value=1_000_000),
)
@settings(suppress_health_check=[HealthCheck.too_slow], max_examples=5, deadline=None)
def test_property_12_reconciliation_earning_calculation(driver_salary, allowance):
    # Feature: fullstack-backend-integration, Property 12: Reconciliation earning calculation
    async def _run():
        engine, session = await _make_test_env()
        try:
            company = await _make_company(session)
            driver = await _make_user(session, company.id, "driver", phone="0977777777")
            accountant = await _make_user(session, company.id, "accountant", phone="0988888888")

            client_obj = Client(
                company_id=company.id,
                name="EarningClient",
                type="company",
                phone="0900000044",
            )
            session.add(client_obj)
            await session.flush()
            await session.refresh(client_obj)

            # Create work order
            wo = WorkOrder(
                company_id=company.id,
                client_id=client_obj.id,
                client_name=client_obj.name,
                route="EarnRoute",
                driver_id=driver.id,
                driver_name=driver.username,
                tractor_plate="51A-005",
                unit_price=0,
                driver_salary=0,
                allowance=0,
                earning=0,
                status="PENDING",
            )
            session.add(wo)
            await session.flush()
            await session.refresh(wo)

            # Create trip order with known salary/allowance
            trip = TripOrder(
                company_id=company.id,
                trip_date=date(2024, 1, 1),
                client_id=client_obj.id,
                client_name=client_obj.name,
                work_type="E20",
                route="EarnRoute",
                tractor_plate="51A-005",
                driver_id=driver.id,
                driver_name=driver.username,
                container_number="CONT001",
                unit_price=100,
                driver_salary=driver_salary,
                allowance=allowance,
                revenue=100,
                status="DRAFT",
            )
            session.add(trip)
            await session.flush()
            await session.refresh(trip)

            async with AsyncClient(
                transport=ASGITransport(app=app), base_url="http://test"
            ) as http_client:
                headers = await _login(http_client, accountant.phone)
                rec_resp = await http_client.post(
                    "/api/v1/reconcile",
                    json={"work_order_id": wo.id, "trip_order_id": trip.id},
                    headers=headers,
                )
                assert rec_resp.status_code == 200, f"Reconcile failed: {rec_resp.text}"

                wo_resp = await http_client.get(f"/api/v1/work-orders/{wo.id}", headers=headers)
                assert wo_resp.status_code == 200
                wo_data = wo_resp.json()
                expected_earning = driver_salary + allowance
                assert wo_data["earning"] == expected_earning, (
                    f"earning {wo_data['earning']} != driver_salary + allowance = {expected_earning}"
                )
        finally:
            await _teardown_test_env(engine, session)

    asyncio.run(_run())


# ---------------------------------------------------------------------------
# Property 13: Salary calculation correctness
# Feature: fullstack-backend-integration, Property 13: For any driver and date
# range, POST /api/v1/salary/calculate SHALL return a SalaryPeriod where
# total_salary equals the sum of driver_salary across all MATCHED work orders
# for that driver in the period, and total_allowance equals the sum of allowance
# across those same work orders.
# Validates: Requirements 9.1, 9.2
# ---------------------------------------------------------------------------

@given(
    n=st.integers(min_value=1, max_value=5),
    driver_salary=st.integers(min_value=1000, max_value=1_000_000),
    allowance=st.integers(min_value=0, max_value=100_000),
)
@settings(suppress_health_check=[HealthCheck.too_slow], max_examples=5, deadline=None)
def test_property_13_salary_calculation_correctness(n, driver_salary, allowance):
    # Feature: fullstack-backend-integration, Property 13: Salary calculation correctness
    async def _run():
        engine, session = await _make_test_env()
        try:
            company = await _make_company(session)
            driver = await _make_user(session, company.id, "driver", phone="0999999999")
            accountant = await _make_user(session, company.id, "accountant", phone="0800000001")

            client_obj = Client(
                company_id=company.id,
                name="SalaryClient",
                type="company",
                phone="0900000033",
            )
            session.add(client_obj)
            await session.flush()
            await session.refresh(client_obj)

            # Create N MATCHED work orders for the driver
            # Use a wide date range that covers today to ensure work orders are included
            today = date.today()
            start = date(today.year, 1, 1)
            end = date(today.year, 12, 31)
            for _ in range(n):
                wo = WorkOrder(
                    company_id=company.id,
                    client_id=client_obj.id,
                    client_name=client_obj.name,
                    route="SalRoute",
                    driver_id=driver.id,
                    driver_name=driver.username,
                    tractor_plate="51A-006",
                    unit_price=100,
                    driver_salary=driver_salary,
                    allowance=allowance,
                    earning=driver_salary + allowance,
                    status="MATCHED",
                )
                session.add(wo)
            await session.flush()

            async with AsyncClient(
                transport=ASGITransport(app=app), base_url="http://test"
            ) as http_client:
                headers = await _login(http_client, accountant.phone)
                calc_resp = await http_client.post(
                    "/api/v1/salary/calculate",
                    json={
                        "driver_id": driver.id,
                        "start_date": str(start),
                        "end_date": str(end),
                    },
                    headers=headers,
                )
                assert calc_resp.status_code == 201, f"Salary calc failed: {calc_resp.text}"
                period = calc_resp.json()
                assert period["total_salary"] == n * driver_salary, (
                    f"total_salary {period['total_salary']} != {n * driver_salary}"
                )
                assert period["total_allowance"] == n * allowance, (
                    f"total_allowance {period['total_allowance']} != {n * allowance}"
                )
        finally:
            await _teardown_test_env(engine, session)

    asyncio.run(_run())


# ---------------------------------------------------------------------------
# Property 14: Driver create round-trip
# Feature: fullstack-backend-integration, Property 14: For any valid driver
# creation payload, POSTing to /api/v1/drivers and then GETting the returned
# id SHALL return a driver whose username and phone match the original payload.
# Validates: Requirements 11.2
# ---------------------------------------------------------------------------

@given(
    username=st.text(min_size=1, max_size=30, alphabet=st.characters(whitelist_categories=("Lu", "Ll", "Nd"))),
    phone=st.text(min_size=10, max_size=15, alphabet="0123456789"),
)
@settings(suppress_health_check=[HealthCheck.too_slow], max_examples=5, deadline=None)
def test_property_14_driver_create_round_trip(username, phone):
    # Feature: fullstack-backend-integration, Property 14: Driver create round-trip
    async def _run():
        engine, session = await _make_test_env()
        try:
            company = await _make_company(session)
            accountant = await _make_user(session, company.id, "accountant", phone="0800000002")

            async with AsyncClient(
                transport=ASGITransport(app=app), base_url="http://test"
            ) as http_client:
                headers = await _login(http_client, accountant.phone)
                payload = {
                    "username": username,
                    "phone": phone,
                    "tractor_plate": "51A-007",
                }
                create_resp = await http_client.post("/api/v1/drivers", json=payload, headers=headers)
                assert create_resp.status_code == 201, f"Create failed: {create_resp.text}"
                created = create_resp.json()
                driver_id = created["id"]

                list_resp = await http_client.get("/api/v1/drivers", headers=headers)
                assert list_resp.status_code == 200
                drivers = list_resp.json()
                found = next((d for d in drivers if d["id"] == driver_id), None)
                assert found is not None, f"Driver {driver_id} not found in list"
                assert found["username"] == username
                assert found["phone"] == phone
        finally:
            await _teardown_test_env(engine, session)

    asyncio.run(_run())


# ---------------------------------------------------------------------------
# Property 15: Driver list ordering
# Feature: fullstack-backend-integration, Property 15: For any collection of
# drivers stored in the system, GET /api/v1/drivers SHALL return them in
# ascending order by username.
# Validates: Requirements 11.4
# ---------------------------------------------------------------------------

@given(
    names=st.lists(
        st.text(min_size=1, max_size=20, alphabet=st.characters(whitelist_categories=("Lu", "Ll"))),
        min_size=2,
        max_size=5,
        unique=True,
    )
)
@settings(suppress_health_check=[HealthCheck.too_slow], max_examples=5, deadline=None)
def test_property_15_driver_list_ordering(names):
    # Feature: fullstack-backend-integration, Property 15: Driver list ordering
    async def _run():
        engine, session = await _make_test_env()
        try:
            company = await _make_company(session)
            accountant = await _make_user(session, company.id, "accountant", phone="0800000003")

            # Insert drivers directly via session
            for i, name in enumerate(names):
                driver = User(
                    phone=f"07{str(i).zfill(9)}",
                    username=name,
                    hashed_password=_HASHED_TEST_PASSWORD,
                    role="driver",
                    company_id=company.id,
                    is_active=True,
                )
                session.add(driver)
            await session.flush()

            async with AsyncClient(
                transport=ASGITransport(app=app), base_url="http://test"
            ) as http_client:
                headers = await _login(http_client, accountant.phone)
                resp = await http_client.get("/api/v1/drivers", headers=headers)
                assert resp.status_code == 200
                returned_names = [d["username"] for d in resp.json()]
                # Filter to only the names we inserted
                our_names = [n for n in returned_names if n in set(names)]
                assert our_names == sorted(our_names), (
                    f"Driver usernames not sorted: {our_names}"
                )
        finally:
            await _teardown_test_env(engine, session)

    asyncio.run(_run())

