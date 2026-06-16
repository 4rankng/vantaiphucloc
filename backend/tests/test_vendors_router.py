import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio


async def test_create_vendor_company(async_client: AsyncClient, make_auth_headers):
    headers = await make_auth_headers("accountant")
    payload = {
        "name": "Test Company Vendor",
        "type": "company",
        "phone": "0901234567",
        "tax_code": "0123456789",
        "address": "123 Test Street",
        "contact_person": "John Doe",
    }
    response = await async_client.post("/api/v1/vendors", json=payload, headers=headers)
    assert response.status_code == 201, response.text
    data = response.json()
    assert data["type"] == "company"
    assert data["name"] == "Test Company Vendor"
    assert data["tax_code"] == "0123456789"
