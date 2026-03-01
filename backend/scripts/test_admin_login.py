"""
Admin giriş testi — HTTP API üzerinden gerçek login testi.
FastAPI /api/v1/users/login endpoint'ini test eder.

Kullanım:
    cd backend
    python scripts/test_admin_login.py

    # Farklı host:
    API_URL=http://localhost:8000 python scripts/test_admin_login.py
"""

import asyncio
import os
import sys
import json
import logging

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

# Test edilecek admin bilgileri
ADMIN_EMAIL = "bendedo13@gmail.com"
ADMIN_PASSWORD = "Benalan.1"
API_URL = os.getenv("API_URL", "http://localhost:8000")


async def test_api_login() -> bool:
    """HTTP API üzerinden admin girişini test eder."""
    try:
        import httpx
    except ImportError:
        logger.warning("httpx yüklü değil, pip install httpx ile yükleyin.")
        logger.warning("DB doğrudan test ediliyor...")
        return await test_db_login()

    async with httpx.AsyncClient(timeout=10.0) as client:
        # 1. Login isteği
        logger.info("POST %s/api/v1/users/login", API_URL)
        try:
            response = await client.post(
                f"{API_URL}/api/v1/users/login",
                json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
            )
        except httpx.ConnectError:
            logger.warning("API sunucusuna bağlanılamadı (%s). DB testi yapılıyor...", API_URL)
            return await test_db_login()

        logger.info("HTTP Status: %d", response.status_code)

        if response.status_code != 200:
            logger.error("❌ GİRİŞ BAŞARISIZ! Status: %d", response.status_code)
            logger.error("   Yanıt: %s", response.text)
            return False

        data = response.json()
        token = data.get("access_token")
        user = data.get("user", {})

        logger.info("✅ GİRİŞ BAŞARILI!")
        logger.info("   Token: %s...%s", token[:20], token[-10:] if token else "")
        logger.info("   User ID: %s", user.get("id"))
        logger.info("   Email: %s", user.get("email"))
        logger.info("   is_admin: %s", user.get("is_admin"))

        if not user.get("is_admin"):
            logger.error("❌ UYARI: Kullanıcı admin değil!")
            return False

        # 2. Admin endpoint testi
        logger.info("\n--- ADMIN ENDPOINT TESTİ ---")
        admin_response = await client.get(
            f"{API_URL}/api/v1/admin/stats",
            headers={"Authorization": f"Bearer {token}"},
        )
        logger.info("Admin Stats HTTP Status: %d", admin_response.status_code)

        if admin_response.status_code == 200:
            stats = admin_response.json()
            logger.info("✅ ADMIN PANELİ ERİŞİMİ BAŞARILI!")
            logger.info("   Toplam Kullanıcı: %s", stats.get("total_users"))
            logger.info("   Admin Kullanıcı: %s", stats.get("admin_users"))
            logger.info("   Toplam Deprem: %s", stats.get("total_earthquakes"))
            return True
        else:
            logger.error("❌ Admin paneline erişim başarısız! Status: %d", admin_response.status_code)
            logger.error("   Yanıt: %s", admin_response.text)
            return False


async def test_db_login() -> bool:
    """Veritabanı üzerinden doğrudan giriş testi."""
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

    try:
        from app.config import settings
        from app.services.auth import verify_password
        from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
        from sqlalchemy import text

        engine = create_async_engine(settings.DATABASE_URL, echo=False)
        AsyncSession_ = async_sessionmaker(engine, expire_on_commit=False)

        async with AsyncSession_() as session:
            result = await session.execute(
                text("SELECT id, email, password_hash, is_admin, is_active FROM users WHERE email = :email"),
                {"email": ADMIN_EMAIL}
            )
            user = result.fetchone()

            if not user:
                logger.error("❌ DB TESTİ BAŞARISIZ: Kullanıcı bulunamadı!")
                await engine.dispose()
                return False

            is_valid = verify_password(ADMIN_PASSWORD, user[2])

            if is_valid and user[3] and user[4]:
                logger.info("✅ DB GİRİŞ TESTİ BAŞARILI!")
                logger.info("   ID: %d, Email: %s, is_admin: %s", user[0], user[1], user[3])
                await engine.dispose()
                return True
            else:
                logger.error("❌ DB TESTİ BAŞARISIZ!")
                logger.error("   Şifre: %s, is_admin: %s, is_active: %s", is_valid, user[3], user[4])
                await engine.dispose()
                return False

    except Exception as e:
        logger.error("❌ DB bağlantı hatası: %s", e)
        return False


async def main() -> None:
    """Ana test fonksiyonu."""
    logger.info("=" * 50)
    logger.info("ADMIN GİRİŞ TESTİ")
    logger.info("=" * 50)
    logger.info("Email: %s", ADMIN_EMAIL)
    logger.info("Şifre: %s", "*" * len(ADMIN_PASSWORD))
    logger.info("API URL: %s", API_URL)
    logger.info("=" * 50)

    success = await test_api_login()

    logger.info("\n" + "=" * 50)
    if success:
        logger.info("🎉 TÜM TESTLER BAŞARILI!")
        logger.info("Admin panele giriş yapılabilir.")
    else:
        logger.error("💥 TEST BAŞARISIZ!")
        logger.error("Lütfen create_admin.py scriptini çalıştırın.")
        sys.exit(1)
    logger.info("=" * 50)


if __name__ == "__main__":
    asyncio.run(main())