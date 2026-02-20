"""
Alembic env.py — Deprem App
Async SQLAlchemy 2.0 + asyncpg desteği ile yapılandırılmıştır.
Tüm modeller otomatik import edilerek autogenerate çalışır.
"""

import asyncio
import os
from logging.config import fileConfig

from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

from alembic import context

# Uygulama config ve Base import
from app.config import settings
from app.database import Base

# Tüm modelleri import et — autogenerate için zorunlu
import app.models  # noqa: F401

# Alembic Config objesi
config = context.config

# Logging yapılandırması
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Hedef metadata — autogenerate bu metadata üzerinden çalışır
target_metadata = Base.metadata


def get_url() -> str:
    """Veritabanı URL'ini ortam değişkeninden veya settings'ten al."""
    return os.getenv("DATABASE_URL", settings.DATABASE_URL)


def run_migrations_offline() -> None:
    """
    'Offline' modda migration — DB bağlantısı kurmadan SQL script üretir.
    sqlalchemy.url config'den alınır.
    """
    url = get_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
        compare_server_default=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    """Gerçek migration çalıştırma — online modda kullanılır."""
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        compare_type=True,
        compare_server_default=True,
    )

    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """
    Async engine ile migration — asyncpg driver ile çalışır.
    NullPool kullanılır: migration tek seferlik bir işlem.
    """
    # asyncpg URL'i psycopg2-uyumlu forma dönüştür (offline için)
    db_url = get_url()

    configuration = config.get_section(config.config_ini_section, {})
    configuration["sqlalchemy.url"] = db_url

    connectable = async_engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


def run_migrations_online() -> None:
    """Online mod: asyncio event loop üzerinde async migration çalıştır."""
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
