"""
Integration test fixtures for the running TTransport backend.
All tests call the real API at http://localhost:8100/api/v1.
"""

import time
import pytest
import httpx
from datetime import date
from uuid import uuid4

BASE_URL = "http://localhost:8100/api/v1"

SEED_USERS = {
    "superadmin": {"username": "admin", "password": "admin123"},
    "director": {"username": "giamdoc", "password": "admin123"},
    "accountant": {"username": "ketoan", "password": "admin123"},
    "driver": {"username": "taixe1", "password": "admin123"},
}

_cached_tokens: dict[str, str] = {}


def _uid() -> str:
    return uuid4().hex[:8]


# ISO 6346 letter-to-number mapping (same as backend/app/utils/iso6346.py)
_ISO_LETTER_MAP = {
    "A": 10, "B": 12, "C": 13, "D": 14, "E": 15, "F": 16, "G": 17, "H": 18, "I": 19,
    "J": 20, "K": 21, "L": 23, "M": 24, "N": 25, "O": 26, "P": 27, "Q": 28, "R": 29,
    "S": 30, "T": 31, "U": 32, "V": 34, "W": 35, "X": 36, "Y": 37, "Z": 38,
}
_ISO_POWERS = [2**i for i in range(10)]


def _container_number() -> str:
    """Generate a valid ISO 6346 container number with correct check digit."""
    import random
    import string
    prefix = ''.join(random.choices(string.ascii_uppercase, k=4))
    serial = ''.join(random.choices(string.digits, k=6))
    base = prefix + serial
    total = 0
    for i, ch in enumerate(base):
        value = _ISO_LETTER_MAP[ch] if ch.isalpha() else int(ch)
        total += value * _ISO_POWERS[i]
    check = total % 11
    if check == 10:
        check = 0
    return f"{base}{check}"


def _get_token(client: httpx.Client, role: str) -> str:
    if role in _cached_tokens:
        return _cached_tokens[role]
    creds = SEED_USERS[role]
    # Retry with backoff to handle rate limiting
    for attempt in range(5):
        resp = client.post("/auth/login", json=creds)
        if resp.status_code == 200:
            token = resp.json()["access_token"]
            _cached_tokens[role] = token
            return token
        if resp.status_code == 429:
            time.sleep(2 ** attempt)
            continue
        raise AssertionError(f"Login failed for {role}: {resp.text}")
    raise AssertionError(f"Login failed for {role} after retries: rate limited")


# ── HTTP client fixture ──────────────────────────────────────────────

# Shared client at module scope to avoid rate limiting
_shared_client: httpx.Client | None = None


@pytest.fixture(scope="session")
def api_client():
    global _shared_client
    _shared_client = httpx.Client(base_url=BASE_URL, timeout=30.0)
    yield _shared_client
    _shared_client.close()
    _shared_client = None


# ── Auth header fixtures ─────────────────────────────────────────────


@pytest.fixture(scope="session")
def admin_headers(api_client):
    token = _get_token(api_client, "superadmin")
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="session")
def accountant_headers(api_client):
    token = _get_token(api_client, "accountant")
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="session")
def director_headers(api_client):
    token = _get_token(api_client, "director")
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="session")
def driver_headers(api_client):
    token = _get_token(api_client, "driver")
    return {"Authorization": f"Bearer {token}"}


# ── Entity factory fixtures ──────────────────────────────────────────


@pytest.fixture
def create_client(api_client, admin_headers):
    created = []

    def _factory(**overrides):
        import random
        payload = {
            "name": f"IT_Client_{_uid()}",
            "code": f"IT{_uid().upper()}",
            "type": "company",
            "phone": f"090{random.randint(1000000, 9999999)}",
        }
        payload.update(overrides)
        resp = api_client.post("/clients", json=payload, headers=admin_headers)
        assert resp.status_code in (200, 201), f"Create client failed: {resp.text}"
        data = resp.json()
        created.append(data["id"])
        return data

    yield _factory

    for cid in created:
        try:
            api_client.request(
                "DELETE", f"/clients/{cid}",
                headers=admin_headers,
                json={"reason": "integration test cleanup"},
            )
        except Exception:
            pass


@pytest.fixture
def create_location(api_client, admin_headers):
    created = []

    def _factory(**overrides):
        payload = {"name": f"IT_Location_{_uid()}"}
        payload.update(overrides)
        resp = api_client.post("/locations", json=payload, headers=admin_headers)
        assert resp.status_code in (200, 201), f"Create location failed: {resp.text}"
        data = resp.json()
        created.append(data["id"])
        return data

    yield _factory

    for lid in created:
        try:
            api_client.delete(f"/locations/{lid}", headers=admin_headers)
        except Exception:
            pass


@pytest.fixture
def create_vendor(api_client, admin_headers):
    created = []

    def _factory(**overrides):
        payload = {"name": f"IT_Vendor_{_uid()}", "type": "company"}
        payload.update(overrides)
        resp = api_client.post("/vendors", json=payload, headers=admin_headers)
        assert resp.status_code in (200, 201), f"Create vendor failed: {resp.text}"
        data = resp.json()
        created.append(data["id"])
        return data

    yield _factory

    for vid in created:
        try:
            api_client.delete(f"/vendors/{vid}", headers=admin_headers)
        except Exception:
            pass


@pytest.fixture
def create_route(api_client, admin_headers, create_location):
    created = []

    def _factory(**overrides):
        pickup = create_location()
        dropoff = create_location()
        payload = {
            "route": f"IT_Route_{_uid()}",
            "pickup_location_id": pickup["id"],
            "dropoff_location_id": dropoff["id"],
        }
        payload.update(overrides)
        resp = api_client.post("/routes", json=payload, headers=admin_headers)
        assert resp.status_code in (200, 201), f"Create route failed: {resp.text}"
        data = resp.json()
        created.append(data["id"])
        return data

    yield _factory

    for rid in created:
        try:
            api_client.delete(f"/routes/{rid}", headers=admin_headers)
        except Exception:
            pass


@pytest.fixture
def create_pricing(api_client, admin_headers, create_client, create_location):
    created = []

    def _factory(**overrides):
        client = create_client()
        pickup = create_location()
        dropoff = create_location()
        payload = {
            "client_id": client["id"],
            "work_type": "E20",
            "pickup_location_id": pickup["id"],
            "dropoff_location_id": dropoff["id"],
            "lines": [{"quantity": 1, "unit_price": 1000000, "driver_salary": 300000, "allowance": 50000}],
        }
        payload.update(overrides)
        resp = api_client.post("/pricings", json=payload, headers=admin_headers)
        assert resp.status_code in (200, 201), f"Create pricing failed: {resp.text}"
        data = resp.json()
        created.append(data["id"])
        return data

    yield _factory

    for pid in created:
        try:
            api_client.delete(f"/pricings/{pid}", headers=admin_headers)
        except Exception:
            pass


@pytest.fixture
def create_work_order(api_client, admin_headers, create_client, create_location):
    created = []

    def _factory(driver_id=None, **overrides):
        client = create_client()
        pickup = create_location()
        dropoff = create_location()
        uid = _uid()
        payload = {
            "client_id": client["id"],
            "route": f"IT_Route_{uid}",
            "pickup_location_id": pickup["id"],
            "dropoff_location_id": dropoff["id"],
            "driver_id": driver_id or 4,
            "tractor_plate": "29C-12345",
            "containers": [{"container_number": _container_number(), "work_type": "E20"}],
        }
        payload.update(overrides)
        resp = api_client.post("/work-orders", json=payload, headers=admin_headers)
        assert resp.status_code in (200, 201), f"Create WO failed: {resp.text}"
        data = resp.json()
        created.append(data["id"])
        return data

    yield _factory

    for wid in created:
        try:
            api_client.put(
                f"/work-orders/{wid}/cancel",
                headers=admin_headers,
                json={"reason": "integration test cleanup"},
            )
        except Exception:
            pass


@pytest.fixture
def create_trip_order(api_client, admin_headers, create_client, create_location):
    created = []

    def _factory(**overrides):
        client = create_client()
        pickup = create_location()
        dropoff = create_location()
        uid = _uid()
        payload = {
            "trip_date": date.today().isoformat(),
            "client_id": client["id"],
            "route": f"IT_Route_{uid}",
            "pickup_location_id": pickup["id"],
            "dropoff_location_id": dropoff["id"],
            "unit_price": 1000000,
            "driver_salary": 300000,
            "allowance": 50000,
            "revenue": 1000000,
            "containers": [{"container_number": _container_number(), "work_type": "E20"}],
        }
        payload.update(overrides)
        resp = api_client.post("/trip-orders", json=payload, headers=admin_headers)
        assert resp.status_code in (200, 201), f"Create TO failed: {resp.text}"
        data = resp.json()
        created.append(data["id"])
        return data

    yield _factory

    for tid in created:
        try:
            api_client.request(
                "DELETE", f"/trip-orders/{tid}",
                headers=admin_headers,
                json={"reason": "integration test cleanup"},
            )
        except Exception:
            pass
