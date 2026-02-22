"""
Veritabanı bağlantısı ve session yönetimi.
FastAPI async + Celery worker sync kullanımı için.
"""

import logging
from typing import AsyncGenerator

from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker, Session

from app.config import settings

logger = logging.getLogger(__name__)


class Base(DeclarativeBase):
    """ORM taban sınıfı."""
    pass


# Senkron engine (Celery worker, migration)
_sync_url = settings.DATABASE_URL.replace("+asyncpg", "").replace("postgresql+asyncpg", "postgresql")
sync_engine = create_engine(_sync_url, pool_pre_ping=True)
SyncSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=sync_engine)


# Asenkron engine (FastAPI)
async_engine = create_async_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
)
AsyncSessionLocal = async_sessionmaker(
    async_engine, class_=AsyncSession, expire_on_commit=False
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency: async session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


def get_sync_session() -> Session:
    """Celery worker için senkron session. 'with SyncSessionLocal() as s' tercih edin."""
    return SyncSessionLocal()


# init_db() KALDIRILDI - Production'da Alembic migration kullanıyoruz
# create_all() kullanmak DuplicateTableError'a sebep olur
# Migration: docker exec deprem_backend alembic upgrade head
