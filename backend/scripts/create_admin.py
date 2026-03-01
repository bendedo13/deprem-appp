"""
Admin kullanıcısı oluşturma/güncelleme scripti.
Migration çalıştırılamadığında veya hızlı test için kullanılır.

Kullanım:
    cd backend
    python scripts/create_admin.py

    # Farklı bilgilerle:
    ADMIN_EMAIL=test@test.com ADMIN_PASSWORD=Test123! python scripts/create_admin.py
"""

import asyncio
import os
import sys
import logging

# Backend dizinini Python path'e ekle
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from passlib.context import CryptContext

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

# Admin bilgileri — ortam değişkeninden veya sabit
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "bendedo13@gmail.com")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "Benalan.1")

# Şifre hash context
_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


async def create_or_update_admin(database_url: str) -> None:
    """Admin kullanıcısını oluşturur veya günceller."""
    engine = create_async_engine(database_url, echo=False)
    AsyncSession_ = async_sessionmaker(engine, expire_on_commit=False)

    async with AsyncSession_() as session:
        # Mevcut kullanıcıyı kontrol et
        result = await session.execute(
            text("SELECT id, email, is_admin FROM users WHERE email = :email"),
            {"email": ADMIN_EMAIL}
        )
        existing = result.fetchone()

        # Şifreyi hash'le
        password_hash = _pwd_context.hash(ADMIN_PASSWORD)

        if existing:
            # Güncelle
            await session.execute(
                text(
                    "UPDATE users SET password_hash = :ph, is_admin = true, is_active = true "
                    "WHERE email = :email"
                ),
                {"ph": password_hash, "email": ADMIN_EMAIL}
            )
            logger.info("✅ Admin kullanıcısı güncellendi: id=%d email=%s", existing[0], ADMIN_EMAIL)
        else:
            # Oluştur
            await session.execute(
                text(
                    "INSERT INTO users (email, password_hash, is_active, is_admin) "
                    "VALUES (:email, :ph, true, true)"
                ),
                {"email": ADMIN_EMAIL, "ph": password_hash}
            )
            logger.info("✅ Admin kullanıcısı oluşturuldu: email=%s", ADMIN_EMAIL)

        await session.commit()

        # Doğrulama
        verify_result = await session.execute(
            text("SELECT id, email, is_admin, is_active FROM users WHERE email = :email"),
            {"email": ADMIN_EMAIL}
        )
        user = verify_result.fetchone()
        if user:
            logger.info(
                "✅ Doğrulama: id=%d email=%s is_admin=%s is_active=%s",
                user[0], user[1], user[2], user[3]
            )
        else:
            logger.error("❌ Kullanıcı oluşturulamadı!")

    await engine.dispose()


async def test_login(database_url: str) -> bool:
    """Admin girişini test eder."""
    engine = create_async_engine(database_url, echo=False)
    AsyncSession_ = async_sessionmaker(engine, expire_on_commit=False)

    async with AsyncSession_() as session:
        result = await session.execute(
            text("SELECT id, email, password_hash, is_admin, is_active FROM users WHERE email = :email"),
            {"email": ADMIN_EMAIL}
        )
        user = result.fetchone()

        if not user:
            logger.error("❌ GİRİŞ TESTİ BAŞARISIZ: Kullanıcı bulunamadı!")
            await engine.dispose()
            return False

        # Şifre doğrulama
        is_valid = _pwd_context.verify(ADMIN_PASSWORD, user[2])

        if is_valid and user[3] and user[4]:  # is_admin ve is_active
            logger.info("✅ GİRİŞ TESTİ BAŞARILI!")
            logger.info("   Email: %s", user[1])
            logger.info("   is_admin: %s", user[3])
            logger.info("   is_active: %s", user[4])
            await engine.dispose()
            return True
        else:
            logger.error("❌ GİRİŞ TESTİ BAŞARISIZ!")
            logger.error("   Şifre geçerli mi: %s", is_valid)
            logger.error("   is_admin: %s", user[3])
            logger.error("   is_active: %s", user[4])
            await engine.dispose()
            return False


async def main() -> None:
    """Ana fonksiyon."""
    from app.config import settings

    database_url = os.getenv("DATABASE_URL", settings.DATABASE_URL)
    logger.info("Veritabanı: %s", database_url.split("@")[-1])  # Şifreyi gizle
    logger.info("Admin Email: %s", ADMIN_EMAIL)
    logger.info("Admin Şifre: %s", "*" * len(ADMIN_PASSWORD))

    # Admin oluştur/güncelle
    await create_or_update_admin(database_url)

    # Giriş testi
    logger.info("\n--- GİRİŞ TESTİ ---")
    success = await test_login(database_url)

    if success:
        logger.info("\n🎉 Admin panele giriş yapılabilir!")
        logger.info("   Email: %s", ADMIN_EMAIL)
        logger.info("   Şifre: %s", ADMIN_PASSWORD)
    else:
        logger.error("\n💥 Admin girişi başarısız! Lütfen logları kontrol edin.")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())