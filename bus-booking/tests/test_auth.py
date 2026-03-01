"""
tests/test_auth.py
Unit + integration tests for the auth system.
"""
import pytest
from httpx import AsyncClient
from unittest.mock import AsyncMock, patch

from app.main import app
from app.core.security import hash_password, verify_password, create_access_token, decode_token


# ─── Unit tests: security utilities ──────────────────────────────────────────

class TestPasswordHashing:
    def test_hash_is_not_plaintext(self):
        hashed = hash_password("SecurePass1")
        assert hashed != "SecurePass1"

    def test_verify_correct_password(self):
        hashed = hash_password("SecurePass1")
        assert verify_password("SecurePass1", hashed) is True

    def test_reject_wrong_password(self):
        hashed = hash_password("SecurePass1")
        assert verify_password("WrongPass1", hashed) is False


class TestJWT:
    def test_create_and_decode_access_token(self):
        token = create_access_token("user-uuid-123", "user")
        payload = decode_token(token)
        assert payload["sub"] == "user-uuid-123"
        assert payload["role"] == "user"
        assert payload["type"] == "access"

    def test_invalid_token_raises(self):
        from jose import JWTError
        with pytest.raises(JWTError):
            decode_token("not.a.valid.token")


# ─── Integration tests: API endpoints ────────────────────────────────────────

@pytest.fixture
def mock_db():
    """Mock async database session."""
    session = AsyncMock()
    session.execute = AsyncMock()
    session.flush = AsyncMock()
    session.commit = AsyncMock()
    session.rollback = AsyncMock()
    return session


@pytest.mark.asyncio
async def test_register_endpoint_validation():
    """Password without uppercase should return 422."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.post(
            "/api/v1/auth/register",
            json={
                "name": "Test User",
                "email": "test@example.com",
                "password": "weakpassword",   # no uppercase, no digit
            },
        )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_health_check():
    """Health endpoint should return 200 when Redis is available."""
    with patch("app.main.get_redis") as mock_redis:
        mock_r = AsyncMock()
        mock_r.ping = AsyncMock(return_value=True)
        mock_redis.return_value = mock_r

        async with AsyncClient(app=app, base_url="http://test") as client:
            response = await client.get("/health")

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"


# ─── Unit tests: seat locking ─────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_seat_lock_acquire_success():
    with patch("app.db.redis.get_redis") as mock_get:
        mock_r = AsyncMock()
        mock_r.set = AsyncMock(return_value=True)
        mock_get.return_value = mock_r

        from app.db.redis import acquire_seat_lock
        result = await acquire_seat_lock("seat-123", "user-456")
        assert result is True
        mock_r.set.assert_called_once_with("seat_lock:seat-123", "user-456", nx=True, ex=300)


@pytest.mark.asyncio
async def test_seat_lock_acquire_failure():
    with patch("app.db.redis.get_redis") as mock_get:
        mock_r = AsyncMock()
        mock_r.set = AsyncMock(return_value=None)    # Redis returns None if NX fails
        mock_get.return_value = mock_r

        from app.db.redis import acquire_seat_lock
        result = await acquire_seat_lock("seat-123", "another-user")
        assert result is False


# ─── Unit tests: booking service ─────────────────────────────────────────────

@pytest.mark.asyncio
async def test_booking_fails_without_seat_lock():
    """Creating booking without Redis lock should raise SeatLockError."""
    from app.services.booking_service import create_booking
    from app.schemas.booking import BookingCreate
    from app.core.exceptions import SeatLockError
    import uuid

    bus_id = uuid.uuid4()
    seat_id = uuid.uuid4()
    user_id = uuid.uuid4()

    payload = BookingCreate(
        bus_id=bus_id,
        seat_ids=[seat_id],
        passenger_name="Test Passenger",
    )

    mock_db = AsyncMock()

    # Seat exists and available
    seat_mock = AsyncMock()
    seat_mock.scalars = AsyncMock(return_value=AsyncMock(all=lambda: [AsyncMock(id=seat_id, status="available", seat_number="A1")]))
    mock_db.execute = AsyncMock(return_value=seat_mock)

    # But Redis lock is NOT held by this user
    with patch("app.services.booking_service.get_seat_lock_owner", AsyncMock(return_value="different-user")):
        with pytest.raises(SeatLockError):
            await create_booking(mock_db, payload, user_id, "test@example.com")


# ─── Fixtures for pytest config ──────────────────────────────────────────────

# conftest.py equivalent inline
@pytest.fixture(autouse=True)
def reset_mocks():
    yield  # test runs here
