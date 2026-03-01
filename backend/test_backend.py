"""
Backend sağlık testi — bağımsız çalışır, pytest gerektirmez.
Çalıştırma: python test_backend.py
"""

import asyncio
import sys
import os

# Backend dizinini path'e ekle
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


async def test_imports():
    """Temel modüllerin import edilip edilemediğini kontrol eder."""
    print("\n[1] Import testleri...")
    hatalar = []

    modüller = [
        ("app.config", "settings"),
        ("app.database", "Base"),
        ("app.models.user", "User"),
        ("app.models.earthquake", "Earthquake"),
        ("app.models.emergency_contact", "EmergencyContact"),
        ("app.models.notification_pref", "NotificationPref"),
        ("app.models.seismic_report", "SeismicReport"),
        ("app.services.auth", "hash_password"),
    ]

    for modül, nesne in modüller:
        try:
            mod = __import__(modül, fromlist=[nesne])
            getattr(mod, nesne)
            print(f"  ✅ {modül}.{nesne}")
        except Exception as e:
            print(f"  ❌ {modül}.{nesne} — {e}")
            hatalar.append((modül, str(e)))

    return hatalar


async def test_config():
    """Config değerlerinin okunup okunamadığını kontrol eder."""
    print("\n[2] Config testleri...")
    hatalar = []

    try:
        from app.config import settings
        alanlar = [
            ("APP_NAME", settings.APP_NAME),
            ("DATABASE_URL", settings.DATABASE_URL[:30] + "..."),
            ("REDIS_URL", settings.REDIS_URL),
            ("SECRET_KEY uzunluğu", f"{len(settings.SECRET_KEY)} karakter"),
            ("ACCESS_TOKEN_EXPIRE_MINUTES", settings.ACCESS_TOKEN_EXPIRE_MINUTES),
        ]
        for ad, değer in alanlar:
            print(f"  ✅ {ad}: {değer}")
    except Exception as e:
        print(f"  ❌ Config yüklenemedi: {e}")
        hatalar.append(("config", str(e)))

    return hatalar


async def test_auth_service():
    """Auth servisinin (hash/verify/token) çalışıp çalışmadığını test eder."""
    print("\n[3] Auth servis testleri...")
    hatalar = []

    try:
        from app.services.auth import hash_password, verify_password, create_access_token, decode_token

        # Şifre hash testi
        şifre = "TestŞifre123!"
        hash_değer = hash_password(şifre)
        assert hash_değer != şifre, "Hash şifreyle aynı olmamalı"
        print(f"  ✅ hash_password çalışıyor")

        # Şifre doğrulama testi
        assert verify_password(şifre, hash_değer), "Doğru şifre doğrulanmalı"
        assert not verify_password("yanlış", hash_değer), "Yanlış şifre reddedilmeli"
        print(f"  ✅ verify_password çalışıyor")

        # JWT token testi
        token = create_access_token(user_id=42, email="test@test.com")
        assert token and len(token) > 10, "Token üretilmeli"
        print(f"  ✅ create_access_token çalışıyor")

        # Token decode testi
        payload = decode_token(token)
        assert payload is not None, "Token decode edilmeli"
        assert payload.get("sub") == "42", f"sub=42 beklendi, {payload.get('sub')} geldi"
        print(f"  ✅ decode_token çalışıyor (sub={payload.get('sub')})")

    except Exception as e:
        print(f"  ❌ Auth servis hatası: {e}")
        hatalar.append(("auth", str(e)))

    return hatalar


async def test_fastapi_app():
    """FastAPI uygulamasının oluşturulup oluşturulamadığını test eder."""
    print("\n[4] FastAPI uygulama testleri...")
    hatalar = []

    try:
        # Lifespan'i tetiklemeden sadece app objesini import et
        from app.main import app
        assert app is not None
        print(f"  ✅ FastAPI app oluşturuldu: {app.title} v{app.version}")

        # Router'ların kayıtlı olup olmadığını kontrol et
        rotalar = [r.path for r in app.routes]
        beklenen_rotalar = [
            "/api/v1/earthquakes",
            "/api/v1/users/register",
            "/api/v1/users/login",
            "/health",
            "/api/v1/health",
        ]
        for rota in beklenen_rotalar:
            # Prefix eşleşmesi yeterli
            bulunan = any(r.startswith(rota) or r == rota for r in rotalar)
            if bulunan:
                print(f"  ✅ Rota kayıtlı: {rota}")
            else:
                print(f"  ⚠️  Rota bulunamadı: {rota}")

    except Exception as e:
        print(f"  ❌ FastAPI app hatası: {e}")
        hatalar.append(("fastapi", str(e)))

    return hatalar


async def test_database_connection():
    """Veritabanı bağlantısını test eder."""
    print("\n[5] Veritabanı bağlantı testi...")
    hatalar = []

    try:
        from app.database import async_engine
        from sqlalchemy import text

        async with async_engine.connect() as conn:
            sonuç = await conn.execute(text("SELECT 1 AS ping"))
            satır = sonuç.fetchone()
            assert satır[0] == 1
            print(f"  ✅ PostgreSQL bağlantısı başarılı (SELECT 1 = {satır[0]})")

        # Tabloların varlığını kontrol et
        async with async_engine.connect() as conn:
            sonuç = await conn.execute(text(
                "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename"
            ))
            tablolar = [r[0] for r in sonuç.fetchall()]
            beklenen = ["users", "earthquakes", "emergency_contacts", "notification_prefs"]
            for tablo in beklenen:
                if tablo in tablolar:
                    print(f"  ✅ Tablo mevcut: {tablo}")
                else:
                    print(f"  ⚠️  Tablo eksik: {tablo} (migration çalıştırıldı mı?)")

    except Exception as e:
        print(f"  ❌ Veritabanı bağlantı hatası: {e}")
        print(f"     İpucu: PostgreSQL çalışıyor mu? DATABASE_URL doğru mu?")
        hatalar.append(("database", str(e)))

    return hatalar


async def test_redis_connection():
    """Redis bağlantısını test eder."""
    print("\n[6] Redis bağlantı testi...")
    hatalar = []

    try:
        from app.core.redis import get_redis, close_redis

        redis = await get_redis()
        pong = await redis.ping()
        assert pong, "Redis ping başarısız"
        print(f"  ✅ Redis bağlantısı başarılı (PING → PONG)")

        # Basit set/get testi
        await redis.set("test:depremapp", "çalışıyor", ex=10)
        değer = await redis.get("test:depremapp")
        assert değer == "çalışıyor", f"Beklenen 'çalışıyor', gelen: {değer}"
        print(f"  ✅ Redis SET/GET çalışıyor")

        await redis.delete("test:depremapp")
        await close_redis()

    except Exception as e:
        print(f"  ❌ Redis bağlantı hatası: {e}")
        print(f"     İpucu: Redis çalışıyor mu? REDIS_URL doğru mu?")
        hatalar.append(("redis", str(e)))

    return hatalar


async def test_httpx_health():
    """Çalışan sunucuya HTTP isteği atar (sunucu ayakta olmalı)."""
    print("\n[7] HTTP health check testi (sunucu çalışıyorsa)...")
    hatalar = []

    try:
        import httpx

        async with httpx.AsyncClient(timeout=5.0) as client:
            yanıt = await client.get("http://localhost:8000/health")
            assert yanıt.status_code == 200, f"HTTP {yanıt.status_code}"
            veri = yanıt.json()
            assert veri.get("status") == "ok", f"status=ok beklendi: {veri}"
            print(f"  ✅ /health → {veri}")

            yanıt2 = await client.get("http://localhost:8000/api/v1/health")
            assert yanıt2.status_code == 200
            print(f"  ✅ /api/v1/health → {yanıt2.json()}")

    except ImportError:
        print(f"  ⚠️  httpx kurulu değil, HTTP testi atlandı (pip install httpx)")
    except Exception as e:
        print(f"  ⚠️  HTTP testi başarısız (sunucu çalışmıyor olabilir): {e}")
        # HTTP testi opsiyonel — hata sayılmaz

    return hatalar


async def main():
    """Tüm testleri çalıştırır ve özet gösterir."""
    print("=" * 55)
    print("  Deprem App — Backend Sağlık Testi")
    print("=" * 55)

    tüm_hatalar = []

    # Sırayla testleri çalıştır
    tüm_hatalar += await test_imports()
    tüm_hatalar += await test_config()
    tüm_hatalar += await test_auth_service()
    tüm_hatalar += await test_fastapi_app()
    tüm_hatalar += await test_database_connection()
    tüm_hatalar += await test_redis_connection()
    tüm_hatalar += await test_httpx_health()

    # Özet
    print("\n" + "=" * 55)
    if not tüm_hatalar:
        print("  ✅ TÜM TESTLER BAŞARILI — Backend hazır!")
    else:
        print(f"  ❌ {len(tüm_hatalar)} HATA BULUNDU:")
        for modül, hata in tüm_hatalar:
            print(f"     • {modül}: {hata}")
        print("\n  Lütfen hataları giderin ve tekrar çalıştırın.")
    print("=" * 55)

    # Hata varsa exit code 1 döndür (CI/CD için)
    sys.exit(1 if tüm_hatalar else 0)


if __name__ == "__main__":
    asyncio.run(main())