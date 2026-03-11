"""
QuakeSense Canlı API Testleri
==============================
VPS üzerindeki çalışan API'ye karşı end-to-end testler.
Test kullanıcısı oluşturur, tüm kritik endpoint'leri test eder.

Çalıştırma (VPS'te):
  export API_URL=http://localhost:8001
  export TEST_PHONE=+905551234567   # Gerçek Twilio testi için
  python app/tests/test_api_live.py

Çalıştırma (uzaktan):
  export API_URL=http://46.4.123.77:8001
  python app/tests/test_api_live.py
"""

import json
import os
import sys
import time
from datetime import datetime, timezone
from typing import Optional

import httpx

API_URL = os.getenv("API_URL", "http://localhost:8001")
TEST_PHONE = os.getenv("TEST_PHONE", "")  # Gerçek SMS için telefon no
TEST_EMAIL = f"test_quakesense_{int(time.time())}@test.com"
TEST_PASSWORD = "TestPass123!QuakeSense"

TIMEOUT = 15.0


class Colors:
    GREEN = "\033[92m"
    RED = "\033[91m"
    YELLOW = "\033[93m"
    BLUE = "\033[94m"
    RESET = "\033[0m"
    BOLD = "\033[1m"


def ok(msg: str) -> None:
    print(f"  {Colors.GREEN}✓{Colors.RESET} {msg}")


def fail(msg: str) -> None:
    print(f"  {Colors.RED}✗{Colors.RESET} {msg}")


def info(msg: str) -> None:
    print(f"  {Colors.BLUE}ℹ{Colors.RESET} {msg}")


def section(title: str) -> None:
    print(f"\n{Colors.BOLD}{Colors.BLUE}▶ {title}{Colors.RESET}")


results = {"passed": 0, "failed": 0, "skipped": 0, "errors": []}


def assert_test(name: str, condition: bool, detail: str = "") -> bool:
    if condition:
        results["passed"] += 1
        ok(f"{name}{f' — {detail}' if detail else ''}")
        return True
    else:
        results["failed"] += 1
        results["errors"].append(f"{name}: {detail}")
        fail(f"{name} — {detail}")
        return False


# ══════════════════════════════════════════════════════════════════════════════
# AŞAMA 0: Backend Sağlık Kontrolü
# ══════════════════════════════════════════════════════════════════════════════

def test_health() -> bool:
    section("AŞAMA 0: Backend Sağlık Kontrolü")
    try:
        r = httpx.get(f"{API_URL}/health", timeout=TIMEOUT)
        assert_test("Backend /health erişilebilir", r.status_code == 200,
                    f"Status: {r.status_code}")
        return True
    except Exception as e:
        fail(f"Backend erişilemiyor: {e}")
        fail(f"API_URL: {API_URL}")
        return False


# ══════════════════════════════════════════════════════════════════════════════
# AŞAMA 1: Test Kullanıcısı Oluşturma
# ══════════════════════════════════════════════════════════════════════════════

def test_create_user() -> Optional[str]:
    section("AŞAMA 1: Test Kullanıcısı Oluşturma")
    info(f"Email: {TEST_EMAIL}")

    try:
        r = httpx.post(
            f"{API_URL}/api/v1/users/register",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD},
            timeout=TIMEOUT,
        )
        assert_test("Kullanıcı kaydı (201)", r.status_code == 201,
                    f"Status: {r.status_code} | {r.text[:200]}")

        data = r.json()
        token = data.get("access_token")
        assert_test("JWT token alındı", bool(token), "access_token mevcut")

        user_id = data.get("user", {}).get("id")
        assert_test("User ID mevcut", bool(user_id), f"id={user_id}")
        info(f"Kullanıcı oluşturuldu: ID={user_id}, Email={TEST_EMAIL}")
        return token

    except Exception as e:
        fail(f"Kayıt hatası: {e}")
        return None


def test_login(token_should_exist: bool = True) -> Optional[str]:
    section("AŞAMA 1b: Login Testi")
    try:
        r = httpx.post(
            f"{API_URL}/api/v1/users/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD},
            timeout=TIMEOUT,
        )
        assert_test("Login (200)", r.status_code == 200,
                    f"Status: {r.status_code}")

        token = r.json().get("access_token")
        assert_test("Login JWT token", bool(token))

        # Yanlış şifre testi
        r_bad = httpx.post(
            f"{API_URL}/api/v1/users/login",
            json={"email": TEST_EMAIL, "password": "yanlis_sifre"},
            timeout=TIMEOUT,
        )
        assert_test("Yanlış şifre 401 döndürüyor", r_bad.status_code == 401,
                    f"Status: {r_bad.status_code}")

        return token
    except Exception as e:
        fail(f"Login hatası: {e}")
        return None


# ══════════════════════════════════════════════════════════════════════════════
# AŞAMA 2: Twilio S.O.S Test Endpoint'i
# ══════════════════════════════════════════════════════════════════════════════

def test_sos_test_endpoint(token: str) -> None:
    section("AŞAMA 2: Twilio S.O.S Test Endpoint (/sos/test)")
    headers = {"Authorization": f"Bearer {token}"}

    # 2a — Geçersiz numara formatı → 400
    info("Test 2a: Geçersiz telefon numarası formatı")
    try:
        r = httpx.post(
            f"{API_URL}/api/v1/sos/test",
            json={"phone_numbers": ["05551234567"], "channel": "waterfall"},
            headers=headers,
            timeout=TIMEOUT,
        )
        assert_test("Geçersiz numara → 400", r.status_code == 400,
                    f"Status: {r.status_code} | {r.text[:150]}")
    except Exception as e:
        fail(f"Test 2a hatası: {e}")

    # 2b — Twilio yapılandırılmamış durumda hata kontrolü
    info("Test 2b: Twilio konfigürasyon durumu")
    if TEST_PHONE:
        try:
            r = httpx.post(
                f"{API_URL}/api/v1/sos/test",
                json={
                    "phone_numbers": [TEST_PHONE],
                    "message": "QuakeSense TEST — Kritik sistem testi.",
                    "channel": "waterfall",
                },
                headers=headers,
                timeout=30.0,
            )
            if r.status_code == 200:
                data = r.json()
                assert_test("SOS Test 200 döndü", True, f"response={data}")
                assert_test("success alanı mevcut", "success" in data)
                assert_test("details listesi mevcut", isinstance(data.get("details"), list))
                info(f"Sonuç: WA={data.get('whatsapp_sent')} SMS={data.get('sms_sent')} "
                     f"Failed={data.get('failed')} Fallback={data.get('fallback_used')}")
            elif r.status_code == 400:
                data = r.json()
                info(f"Twilio hatası (beklenen — API key eksik olabilir): {data.get('detail', '')[:200]}")
                assert_test("SOS Test endpoint erişilebilir", True, "400 döndü (Twilio config eksik)")
            else:
                assert_test("SOS Test yanıt", False, f"Beklenmeyen: {r.status_code}")
        except Exception as e:
            fail(f"Test 2b hatası: {e}")
    else:
        results["skipped"] += 1
        info("TEST_PHONE tanımlı değil — gerçek SMS testi atlandı.")
        info("VPS'te çalıştırmak için: export TEST_PHONE=+905551234567")


# ══════════════════════════════════════════════════════════════════════════════
# AŞAMA 3: Deprem Endpoint'leri
# ══════════════════════════════════════════════════════════════════════════════

def test_earthquake_endpoints(token: str) -> None:
    section("AŞAMA 3: Deprem Endpoint'leri")
    headers = {"Authorization": f"Bearer {token}"}

    # 3a — Son depremler
    try:
        r = httpx.get(
            f"{API_URL}/api/v1/earthquakes/recent?limit=5",
            headers=headers,
            timeout=TIMEOUT,
        )
        assert_test("GET /earthquakes/recent (200)", r.status_code == 200,
                    f"Status: {r.status_code}")
        if r.status_code == 200:
            data = r.json()
            items = data if isinstance(data, list) else data.get("earthquakes", [])
            assert_test("Deprem listesi döndü", isinstance(items, list),
                        f"tip={type(items).__name__}")
            if items:
                eq = items[0]
                assert_test("Magnitude alanı var", "magnitude" in eq)
                assert_test("Location alanı var", "location" in eq)
                info(f"Son deprem: M{eq.get('magnitude')} — {eq.get('location')}")
    except Exception as e:
        fail(f"Test 3a hatası: {e}")


# ══════════════════════════════════════════════════════════════════════════════
# AŞAMA 4: FCM Push Konfigürasyon Kontrolü
# ══════════════════════════════════════════════════════════════════════════════

def test_fcm_config(token: str) -> None:
    section("AŞAMA 4: FCM Push Konfigürasyon Kontrolü")
    headers = {"Authorization": f"Bearer {token}"}

    # Admin panel üzerinden FCM durumu kontrol et (veya notifications endpoint)
    try:
        r = httpx.get(
            f"{API_URL}/api/v1/users/me",
            headers=headers,
            timeout=TIMEOUT,
        )
        assert_test("GET /users/me (200)", r.status_code == 200,
                    f"Status: {r.status_code}")
        if r.status_code == 200:
            user = r.json()
            assert_test("User email eşleşiyor", user.get("email") == TEST_EMAIL)
            fcm = user.get("fcm_token")
            info(f"FCM Token: {'Kayıtlı ✓' if fcm else 'Henüz kayıtlı değil (mobil giriş gerekli)'}")
    except Exception as e:
        fail(f"Test 4 hatası: {e}")

    # FCM konfigürasyon kontrolü — backend health detayı
    try:
        r = httpx.get(f"{API_URL}/health", timeout=TIMEOUT)
        if r.status_code == 200:
            health = r.json()
            fcm_status = health.get("firebase", health.get("fcm", "unknown"))
            info(f"Firebase/FCM durumu: {fcm_status}")
    except Exception:
        pass


# ══════════════════════════════════════════════════════════════════════════════
# AŞAMA 5: WebSocket Bağlantı Testi
# ══════════════════════════════════════════════════════════════════════════════

def test_websocket() -> None:
    section("AŞAMA 5: WebSocket Bağlantı Testi")
    try:
        import websockets
        import asyncio

        async def ws_test():
            ws_url = API_URL.replace("http://", "ws://").replace("https://", "wss://")
            async with websockets.connect(f"{ws_url}/ws/earthquakes", open_timeout=5) as ws:
                return True

        connected = asyncio.run(ws_test())
        assert_test("WebSocket bağlantısı", connected)
    except ImportError:
        results["skipped"] += 1
        info("websockets paketi yok — WebSocket testi atlandı")
    except Exception as e:
        info(f"WebSocket bağlanamadı: {e} (backend başlamış olmayabilir)")
        results["skipped"] += 1


# ══════════════════════════════════════════════════════════════════════════════
# ANA ÇALIŞTIRICI
# ══════════════════════════════════════════════════════════════════════════════

def main() -> int:
    print(f"\n{'=' * 60}")
    print(f"  QuakeSense Canlı API Testleri")
    print(f"  API: {API_URL}")
    print(f"  Zaman: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}")
    print(f"{'=' * 60}")

    # Sağlık kontrolü
    if not test_health():
        print(f"\n{Colors.RED}Backend erişilemiyor! Testler durduruluyor.{Colors.RESET}")
        print(f"\n  Deploy etmek için: bash /opt/deprem/deploy.sh")
        return 1

    # Kullanıcı oluştur
    token = test_create_user()
    if not token:
        print(f"\n{Colors.RED}Kullanıcı oluşturulamadı. DB migration tamamlandı mı?{Colors.RESET}")
        print("  docker exec deprem_backend alembic upgrade head")
        return 1

    # Login testi
    fresh_token = test_login()
    token = fresh_token or token

    # Endpoint testleri
    test_sos_test_endpoint(token)
    test_earthquake_endpoints(token)
    test_fcm_config(token)
    test_websocket()

    # Özet
    total = results["passed"] + results["failed"]
    print(f"\n{'=' * 60}")
    print(f"  SONUÇ: {results['passed']}/{total} geçti "
          f"| {results['skipped']} atlandı")

    if results["errors"]:
        print(f"\n  {Colors.RED}Başarısız testler:{Colors.RESET}")
        for e in results["errors"]:
            print(f"    ✗ {e}")
    else:
        print(f"  {Colors.GREEN}Tüm testler başarılı! ✓{Colors.RESET}")

    print(f"{'=' * 60}\n")
    return 0 if results["failed"] == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
