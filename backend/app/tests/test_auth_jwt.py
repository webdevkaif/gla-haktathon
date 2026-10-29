import pytest
from httpx import AsyncClient, ASGITransport
from backend.app.main import app
from backend.app.database import init_db, get_database
from backend.app.services.seed_data import seed_enterprise_data
from backend.app.auth import create_demo_token

@pytest.fixture(autouse=True)
async def setup_test_db():
    await init_db()
    db = get_database()
    await seed_enterprise_data(db)
    yield db

@pytest.mark.asyncio
async def test_x_user_id_alone_rejected_401():
    """X-User-Id alone MUST NOT grant access and must return HTTP 401."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Attempt to access protected endpoint with only X-User-Id
        response = await client.get("/api/users/me", headers={"X-User-Id": "fin_alex"})
        assert response.status_code == 401
        assert "Authentication required" in response.json()["detail"]

        # Attempt to access claims with only X-User-Id
        response2 = await client.get("/api/claims", headers={"X-User-Id": "emp_john"})
        assert response2.status_code == 401

@pytest.mark.asyncio
async def test_login_demo_users_valid_password():
    """POST /api/auth/login with valid demo credentials returns a signed JWT."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post(
            "/api/auth/login",
            json={"username": "emp_john", "password": "password123"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["user"]["id"] == "emp_john"
        assert data["user"]["role"] == "employee"

@pytest.mark.asyncio
async def test_login_invalid_password():
    """POST /api/auth/login with incorrect credentials returns HTTP 401."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post(
            "/api/auth/login",
            json={"username": "emp_john", "password": "wrong_password"}
        )
        assert response.status_code == 401

@pytest.mark.asyncio
async def test_authenticated_jwt_access():
    """Requests with valid signed JWT Bearer token succeed."""
    token = create_demo_token("emp_john")
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get(
            "/api/users/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        user = response.json()
        assert user["id"] == "emp_john"
        assert user["role"] == "employee"

@pytest.mark.asyncio
async def test_role_guard_blocks_unauthorized_role():
    """Employee trying to access finance-only action (e.g. resolve escalation) returns 403."""
    emp_token = create_demo_token("emp_john")
    fin_token = create_demo_token("fin_alex")

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Employee should be forbidden with 403 from resolving escalations
        emp_resp = await client.post(
            "/api/escalations/ESC-001/resolve",
            json={"resolution_notes": "Attempted resolution by employee"},
            headers={"Authorization": f"Bearer {emp_token}"}
        )
        assert emp_resp.status_code == 403
        assert "Access denied" in emp_resp.json()["detail"]

        # Finance user should NOT receive 403 (either 200 or 404 if record doesn't exist)
        fin_resp = await client.post(
            "/api/escalations/ESC-001/resolve",
            json={"resolution_notes": "Resolution by finance controller"},
            headers={"Authorization": f"Bearer {fin_token}"}
        )
        assert fin_resp.status_code != 403
