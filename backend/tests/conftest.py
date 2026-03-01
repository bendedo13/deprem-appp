"""
Pytest fixtures — test veritabanı, async client, mock kullanıcı.
Tüm testler bu fixtures'ı kullanır.
"""

import asyncio
import pytest
import pytest_asyncio
from typing import AsyncGenerator, Generator
from unittest.mock import AsyncMock, MagicMock, patch

from fastapi import FastAPI
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.models.user import User
from app.models.earthquake import Earthquake
from app.models.emergency_contact import EmergencyContact
from app.models.notification_pref import NotificationPref
from app.services.auth import hash_password, create_access_token

# ── Test veritabanı (SQLite in-memory) ────────────────────────────────────────
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestSessionLocal = async_sessionmaker(
    test_engine, class_=AsyncSession, expire_on_commit=False
)


@pytest.fixture(scope="session")
def event_loop():
    """Session-scoped event loop."""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="session")
async def setup_database():
    """Test veritabanı tablolarını oluştur."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def db_session(setup_database) -> AsyncGenerator[AsyncSession, None]:
    """Her test için temiz bir DB session."""
    async with TestSessionLocal() as session:
        yield session
        await session.rollback()


@pytest_asyncio.fixture
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Test HTTP client — DB dependency override edilmiş."""

    async def override_get_db():
        yield db_session

    # Redis mock
    mock_redis = AsyncMock()
    mock_redis.get = AsyncMock(return_value=None)
    mock_redis.set = AsyncMock(return_value=True)
    mock_redis.ping = AsyncMock(return_value=True)
    mock_redis.incr = AsyncMock(return_value=1)
    mock_redis.expire = AsyncMock(return_value=True)
    mock_redis.keys = AsyncMock(return_value=[])
    mock_redis.delete = AsyncMock(return_value=0)

    app.dependency_overrides[get_db] = override_get_db

    with patch("app.core.redis.get_redis", return_value=mock_redis), \
         patch("app.core.redis._redis", mock_redis):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as ac:
            yield ac

    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def test_user(db_session: AsyncSession) -> User:
    """Test kullanıcısı oluşturur."""
    user = User(
        email="test@example.com",
        password_hash=hash_password("TestPass123!"),
        name="Test Kullanıcı",
        phone="+905551234567",
        is_active=True,
        is_admin=False,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def admin_user(db_session: AsyncSession) -> User:
    """Admin test kullanıcısı oluşturur."""
    user = User(
        email="admin@example.com",
        password_hash=hash_password("AdminPass123!"),
        name="Admin Kullanıcı",
        is_active=True,
        is_admin=True,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def test_user_token(test_user: User) -> str:
    """Test kullanıcısı için JWT token."""
    return create_access_token(test_user.id, test_user.email)


@pytest_asyncio.fixture
async def admin_token(admin_user: User) -> str:
    """Admin kullanıcısı için JWT token."""
    return create_access_token(admin_user.id, admin_user.email)


@pytest_asyncio.fixture
async def auth_headers(test_user_token: str) -> dict:
    """Kimlik doğrulama header'ları."""
    return {"Authorization": f"Bearer {test_user_token}"}


@pytest_asyncio.fixture
async def admin_headers(admin_token: str) -> dict:
    """Admin kimlik doğrulama header'ları."""
    return {"Authorization": f"Bearer {admin_token}"}


@pytest_asyncio.fixture
async def test_earthquake(db_session: AsyncSession) -> Earthquake:
    """Test depremi oluşturur."""
    from datetime import datetime, timezone
    quake = Earthquake(
        id="test-12345",
        source="afad",
        magnitude=5.2,
        depth=10.0,
        latitude=39.9,
        longitude=32.8,
        location="Ankara, Türkiye",
        magnitude_type="ML",
        occurred_at=datetime.now(tz=timezone.utc),
    )
    db_session.add(quake)
    await db_session.commit()
    await db_session.refresh(quake)
    return quake


@pytest_asyncio.fixture
async def test_contact(db_session: AsyncSession, test_user: User) -> EmergencyContact:
    """Test acil iletişim kişisi oluşturur."""
    contact = EmergencyContact(
        user_id=test_user.id,
        name="Acil Kişi",
        phone="+905559876543",
        email="acil@example.com",
        relation="Aile",
        methods=["sms"],
        priority=1,
    )
    db_session.add(contact)
    await db_session.commit()
    await db_session.refresh(contact)
    return contact