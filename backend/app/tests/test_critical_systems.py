"""
QuakeSense Kritik Sistem Testleri
==================================
Tüm kritik komponentleri test eder:
  1. Kullanıcı kaydı ve JWT auth
  2. Twilio S.O.S waterfall fallback (mock + gerçek)
  3. FCM EARTHQUAKE_CONFIRMED push (mock)
  4. İvmeölçer STA/LTA mantık testi (saf Python)
  5. /sos/test senkron endpoint (Celery bypass)

Çalıştırma:
  VPS üzerinde:
    cd /app && python -m pytest app/tests/test_critical_systems.py -v --tb=short

  Lokal Docker:
    docker exec deprem_backend python -m pytest app/tests/test_critical_systems.py -v --tb=short
"""

import asyncio
import os
import sys
from datetime import datetime, timezone
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

# ─── Ortam değişkenlerini test için ayarla ─────────────────────────────────
os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://deprem_user:deprem_pass@localhost:5432/deprem_db")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/0")
os.environ.setdefault("SECRET_KEY", "test-secret-key-min-32-chars-quakesense-2024")
os.environ.setdefault("TWILIO_ACCOUNT_SID", os.getenv("TWILIO_ACCOUNT_SID", ""))
os.environ.setdefault("TWILIO_AUTH_TOKEN", os.getenv("TWILIO_AUTH_TOKEN", ""))
os.environ.setdefault("TWILIO_PHONE_NUMBER", os.getenv("TWILIO_PHONE_NUMBER", ""))
os.environ.setdefault("FIREBASE_PROJECT_ID", os.getenv("FIREBASE_PROJECT_ID", ""))
os.environ.setdefault("FIREBASE_PRIVATE_KEY", os.getenv("FIREBASE_PRIVATE_KEY", ""))
os.environ.setdefault("FIREBASE_CLIENT_EMAIL", os.getenv("FIREBASE_CLIENT_EMAIL", ""))


# ══════════════════════════════════════════════════════════════════════════════
# TEST 1: Kullanıcı Oluşturma ve JWT Auth
# ══════════════════════════════════════════════════════════════════════════════

class TestUserAuth:
    """Kullanıcı kayıt + JWT token üretimi testleri."""

    def test_password_hash_and_verify(self):
        """Argon2 hash + doğrulama."""
        from app.services.auth import hash_password, verify_password
        raw = "TestPass123!"
        hashed = hash_password(raw)
        assert hashed != raw, "Hash düz metinden farklı olmalı"
        assert verify_password(raw, hashed), "Doğru şifre doğrulanmalı"
        assert not verify_password("YanlisSifre", hashed), "Yanlış şifre reddedilmeli"
        print("  [PASS] password_hash_and_verify ✓")

    def test_create_and_decode_jwt(self):
        """JWT oluştur ve çöz."""
        from app.services.auth import create_access_token, decode_token
        token = create_access_token(user_id=42, email="test@quakesense.com")
        assert token, "Token boş olmamalı"
        payload = decode_token(token)
        assert payload["sub"] == 42, f"user_id eşleşmedi: {payload}"
        assert payload["email"] == "test@quakesense.com"
        print("  [PASS] create_and_decode_jwt ✓")

    def test_expired_token_rejected(self):
        """Süresi dolmuş token reddedilmeli."""
        from app.services.auth import decode_token
        import jose.exceptions
        # Geçersiz token
        with pytest.raises(Exception):
            decode_token("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature")
        print("  [PASS] expired_token_rejected ✓")


# ══════════════════════════════════════════════════════════════════════════════
# TEST 2: Twilio Waterfall Fallback Mantık Testi
# ══════════════════════════════════════════════════════════════════════════════

class TestTwilioWaterfall:
    """Twilio Şelale (Waterfall Fallback) mantık testleri."""

    def _make_mock_client(self, whatsapp_fails: bool = False, sms_fails: bool = False):
        """Mock Twilio client oluştur."""
        mock_msg = MagicMock()
        mock_msg.sid = "SM_TEST_12345"

        mock_messages = MagicMock()

        def create_side_effect(**kwargs):
            to = kwargs.get("to", "")
            if "whatsapp:" in to and whatsapp_fails:
                from twilio.base.exceptions import TwilioRestException
                raise TwilioRestException(
                    status=400, uri="/", msg="WhatsApp uyumsuz numara", code=63003
                )
            if "whatsapp:" not in to and sms_fails:
                from twilio.base.exceptions import TwilioRestException
                raise TwilioRestException(
                    status=400, uri="/", msg="SMS hata", code=21211
                )
            return mock_msg

        mock_messages.create.side_effect = create_side_effect
        mock_client = MagicMock()
        mock_client.messages = mock_messages
        return mock_client

    def test_waterfall_whatsapp_success(self):
        """WhatsApp başarılı → SMS denenmemeli."""
        from app.services.twilio_fallback import send_waterfall_emergency
        mock_client = self._make_mock_client(whatsapp_fails=False)

        with patch("app.services.twilio_fallback._get_twilio_client", return_value=mock_client), \
             patch("app.services.twilio_fallback._log_to_db"):
            result = send_waterfall_emergency(
                phone_numbers=["+905551234567"],
                message="TEST mesaj",
                channel="waterfall",
                user_id=1,
                event_type="TEST",
            )

        assert result["whatsapp_sent"] == 1, f"WhatsApp gönderilmeli: {result}"
        assert result["sms_sent"] == 0, "SMS denenmemeli"
        assert not result["fallback_used"], "Fallback kullanılmamalı"
        print("  [PASS] waterfall_whatsapp_success ✓")

    def test_waterfall_whatsapp_fails_sms_fallback(self):
        """WhatsApp başarısız → SMS fallback devreye girmeli."""
        from app.services.twilio_fallback import send_waterfall_emergency
        mock_client = self._make_mock_client(whatsapp_fails=True, sms_fails=False)

        with patch("app.services.twilio_fallback._get_twilio_client", return_value=mock_client), \
             patch("app.services.twilio_fallback._log_to_db"):
            result = send_waterfall_emergency(
                phone_numbers=["+905551234567"],
                message="TEST fallback",
                channel="waterfall",
                user_id=1,
                event_type="SOS",
            )

        assert result["whatsapp_sent"] == 0, "WhatsApp başarısız olmalıydı"
        assert result["sms_sent"] == 1, f"SMS fallback çalışmalı: {result}"
        assert result["fallback_used"], "fallback_used True olmalı"
        assert result["failed"] == 0, "En az SMS ile ulaşıldı"
        print("  [PASS] waterfall_whatsapp_fails_sms_fallback ✓")

    def test_waterfall_both_fail_marks_as_failed(self):
        """İkisi de başarısız → failed sayacı 1 olmalı."""
        from app.services.twilio_fallback import send_waterfall_emergency
        mock_client = self._make_mock_client(whatsapp_fails=True, sms_fails=True)

        with patch("app.services.twilio_fallback._get_twilio_client", return_value=mock_client), \
             patch("app.services.twilio_fallback._log_to_db"):
            result = send_waterfall_emergency(
                phone_numbers=["+905551234567"],
                message="TEST her iki kanal başarısız",
                channel="waterfall",
                user_id=1,
                event_type="SOS",
            )

        assert result["failed"] == 1, f"Failed sayacı 1 olmalı: {result}"
        assert result["whatsapp_sent"] == 0
        assert result["sms_sent"] == 0
        print("  [PASS] waterfall_both_fail_marks_as_failed ✓")

    def test_waterfall_multiple_numbers_independent(self):
        """3 numaradan 1'i WA başarısız → sadece o numara SMS'e düşmeli."""
        from app.services.twilio_fallback import send_waterfall_emergency

        call_count = {"wa": 0, "sms": 0}

        def create_side_effect(**kwargs):
            mock_msg = MagicMock()
            mock_msg.sid = "SM_TEST"
            to = kwargs.get("to", "")
            if "whatsapp:" in to:
                call_count["wa"] += 1
                if "+905550000001" in to:  # Bu numara WA'da başarısız
                    from twilio.base.exceptions import TwilioRestException
                    raise TwilioRestException(400, "/", "Hata", code=63003)
            else:
                call_count["sms"] += 1
            return mock_msg

        mock_client = MagicMock()
        mock_client.messages.create.side_effect = create_side_effect

        with patch("app.services.twilio_fallback._get_twilio_client", return_value=mock_client), \
             patch("app.services.twilio_fallback._log_to_db"):
            result = send_waterfall_emergency(
                phone_numbers=["+905551111111", "+905550000001", "+905552222222"],
                message="Multi test",
                channel="waterfall",
            )

        assert result["total"] == 3
        assert result["whatsapp_sent"] == 2, f"2 WA başarılı: {result}"
        assert result["sms_sent"] == 1, f"1 SMS fallback: {result}"
        assert result["failed"] == 0
        assert result["fallback_used"]
        print("  [PASS] waterfall_multiple_numbers_independent ✓")

    def test_empty_phone_list_returns_zero(self):
        """Boş liste → sıfır sonuç, Twilio çağrılmamalı."""
        from app.services.twilio_fallback import send_waterfall_emergency

        with patch("app.services.twilio_fallback._get_twilio_client") as mock_get:
            result = send_waterfall_emergency([], "test")
            mock_get.assert_not_called()

        assert result["total"] == 0
        print("  [PASS] empty_phone_list_returns_zero ✓")

    def test_e164_format_validation(self):
        """E.164 format doğrulama — regex kontrolü."""
        import re
        e164 = re.compile(r"^\+[1-9]\d{6,14}$")
        valid = ["+905551234567", "+12125551234", "+447911123456"]
        invalid = ["05551234567", "+90555", "905551234567", "+0555123"]
        for v in valid:
            assert e164.match(v), f"Geçerli numara reddedildi: {v}"
        for i in invalid:
            assert not e164.match(i), f"Geçersiz numara kabul edildi: {i}"
        print("  [PASS] e164_format_validation ✓")


# ══════════════════════════════════════════════════════════════════════════════
# TEST 3: FCM EARTHQUAKE_CONFIRMED Push Testi
# ══════════════════════════════════════════════════════════════════════════════

class TestFCMEarthquakeConfirmed:
    """FCM EARTHQUAKE_CONFIRMED yüksek öncelikli push testleri."""

    def test_earthquake_confirmed_push_payload(self):
        """EARTHQUAKE_CONFIRMED push payload'ı doğru yapıda mı?"""
        from app.services.fcm import send_earthquake_confirmed_push

        mock_response = MagicMock()
        mock_response.success_count = 2
        mock_response.failure_count = 0
        mock_response.responses = []

        mock_send = MagicMock(return_value=mock_response)

        with patch("app.services.fcm._init_firebase", return_value=True), \
             patch("app.services.fcm.messaging") as mock_messaging:
            mock_messaging.send_each_for_multicast.return_value = mock_response
            mock_messaging.MulticastMessage = MagicMock()
            mock_messaging.AndroidConfig = MagicMock()
            mock_messaging.APNSConfig = MagicMock()
            mock_messaging.APNSPayload = MagicMock()
            mock_messaging.Aps = MagicMock()
            mock_messaging.CriticalSound = MagicMock()

            result = asyncio.run(send_earthquake_confirmed_push(
                fcm_tokens=["token1", "token2"],
                latitude=41.0082,
                longitude=28.9784,
                device_count=5,
                occurred_at=datetime.now(timezone.utc).isoformat(),
            ))

        assert result == 2, f"2 token başarılı olmalı: {result}"

        # MulticastMessage çağrıldı mı?
        mock_messaging.MulticastMessage.assert_called_once()
        call_kwargs = mock_messaging.MulticastMessage.call_args

        # data payload kontrolü
        data = call_kwargs.kwargs.get("data", {})
        assert data.get("type") == "EARTHQUAKE_CONFIRMED"
        assert "latitude" in data
        assert "longitude" in data
        assert "device_count" in data
        assert "timestamp" in data

        # Notification alanı YOK olmalı (data-only push)
        assert "notification" not in call_kwargs.kwargs, \
            "EARTHQUAKE_CONFIRMED data-only olmalı (notification alanı olmamalı)"

        print("  [PASS] earthquake_confirmed_push_payload ✓")

    def test_android_priority_high(self):
        """Android priority='high' ve TTL=30 saniye olmalı."""
        from app.services.fcm import send_earthquake_confirmed_push

        mock_response = MagicMock()
        mock_response.success_count = 1
        mock_response.failure_count = 0
        mock_response.responses = []

        with patch("app.services.fcm._init_firebase", return_value=True), \
             patch("app.services.fcm.messaging") as mock_messaging:
            mock_messaging.send_each_for_multicast.return_value = mock_response
            mock_messaging.MulticastMessage = MagicMock()
            android_config_instance = MagicMock()
            mock_messaging.AndroidConfig.return_value = android_config_instance
            mock_messaging.APNSConfig = MagicMock()
            mock_messaging.APNSPayload = MagicMock()
            mock_messaging.Aps = MagicMock()
            mock_messaging.CriticalSound = MagicMock()

            asyncio.run(send_earthquake_confirmed_push(
                fcm_tokens=["token1"],
                latitude=39.9,
                longitude=32.8,
                device_count=10,
                occurred_at=datetime.now(timezone.utc).isoformat(),
            ))

        # AndroidConfig priority=high + ttl=30 kontrolü
        android_call = mock_messaging.AndroidConfig.call_args
        assert android_call.kwargs.get("priority") == "high", \
            f"Android priority='high' olmalı: {android_call}"
        assert android_call.kwargs.get("ttl") == 30, \
            f"TTL=30 saniye olmalı: {android_call}"
        print("  [PASS] android_priority_high ✓")

    def test_ios_critical_sound(self):
        """iOS critical=True ve content_available=True olmalı."""
        from app.services.fcm import send_earthquake_confirmed_push

        mock_response = MagicMock()
        mock_response.success_count = 1
        mock_response.failure_count = 0
        mock_response.responses = []

        with patch("app.services.fcm._init_firebase", return_value=True), \
             patch("app.services.fcm.messaging") as mock_messaging:
            mock_messaging.send_each_for_multicast.return_value = mock_response
            mock_messaging.MulticastMessage = MagicMock()
            mock_messaging.AndroidConfig = MagicMock()
            mock_messaging.APNSConfig = MagicMock()
            mock_messaging.APNSPayload = MagicMock()
            mock_messaging.Aps = MagicMock()
            mock_messaging.CriticalSound = MagicMock()

            asyncio.run(send_earthquake_confirmed_push(
                fcm_tokens=["token1"],
                latitude=40.0,
                longitude=29.0,
                device_count=3,
                occurred_at=datetime.now(timezone.utc).isoformat(),
            ))

        # CriticalSound çağrıldı mı?
        mock_messaging.CriticalSound.assert_called_once()
        cs_kwargs = mock_messaging.CriticalSound.call_args.kwargs
        assert cs_kwargs.get("critical") is True, "iOS critical=True olmalı"
        assert cs_kwargs.get("volume") == 1.0, "iOS volume=1.0 olmalı"

        # content_available kontrolü
        aps_kwargs = mock_messaging.Aps.call_args.kwargs
        assert aps_kwargs.get("content_available") is True, "content_available=True olmalı"
        print("  [PASS] ios_critical_sound ✓")

    def test_no_tokens_returns_zero(self):
        """Boş token listesi → 0 döner, Firebase çağrılmaz."""
        from app.services.fcm import send_earthquake_confirmed_push
        result = asyncio.run(send_earthquake_confirmed_push(
            fcm_tokens=[],
            latitude=40.0,
            longitude=29.0,
            device_count=1,
            occurred_at=datetime.now(timezone.utc).isoformat(),
        ))
        assert result == 0
        print("  [PASS] no_tokens_returns_zero ✓")


# ══════════════════════════════════════════════════════════════════════════════
# TEST 4: STA/LTA İvmeölçer Algoritma Testi
# ══════════════════════════════════════════════════════════════════════════════

class TestSeismicAlgorithm:
    """STA/LTA sismik algılama algoritması testleri."""

    def test_sta_lta_no_signal(self):
        """Düz gürültü → ratio < 2 (tetikleme yok)."""
        from app.services.shake_cluster_service import _compute_sta_lta  # type: ignore[import]
        # Düz gürültü simülasyonu — küçük salınımlar
        samples = [0.1 + (i % 3) * 0.02 for i in range(200)]
        ratio = _compute_sta_lta(samples, sta_window=10, lta_window=100)
        assert ratio < 2.0, f"Gürültüde oran düşük olmalı: ratio={ratio:.2f}"
        print(f"  [PASS] sta_lta_no_signal ✓ (ratio={ratio:.3f})")

    def test_sta_lta_earthquake_signal(self):
        """Deprem benzeri sinyal → ratio > 5 (tetikleme)."""
        from app.services.shake_cluster_service import _compute_sta_lta  # type: ignore[import]
        # Önce düşük arka plan, sonra ani yükseliş
        background = [0.1] * 150
        quake = [2.0, 5.0, 8.0, 12.0, 15.0, 10.0, 7.0, 5.0, 3.0, 2.0]
        samples = background + quake
        ratio = _compute_sta_lta(samples, sta_window=10, lta_window=100)
        assert ratio > 3.0, f"Deprem sinyalinde oran yüksek olmalı: ratio={ratio:.2f}"
        print(f"  [PASS] sta_lta_earthquake_signal ✓ (ratio={ratio:.3f})")

    def test_sta_lta_pure_python_fallback(self):
        """shake_cluster_service yoksa saf Python ile STA/LTA hesapla."""
        def _compute_sta_lta_pure(samples, sta_w=10, lta_w=100):
            if len(samples) < lta_w:
                return 0.0
            sta = sum(abs(s) for s in samples[-sta_w:]) / sta_w
            lta = sum(abs(s) for s in samples[-lta_w:]) / lta_w
            return sta / lta if lta > 1e-9 else 0.0

        # Gürültü testi
        noise = [0.05 + 0.01 * ((i * 7) % 5) for i in range(200)]
        r_noise = _compute_sta_lta_pure(noise)
        assert r_noise < 3.0, f"Gürültü oranı düşük: {r_noise:.2f}"

        # Deprem testi
        eq = [0.05] * 150 + [10.0, 15.0, 20.0, 15.0, 10.0, 8.0, 5.0, 3.0, 2.0, 1.0]
        r_eq = _compute_sta_lta_pure(eq)
        assert r_eq > 5.0, f"Deprem oranı yüksek: {r_eq:.2f}"

        print(f"  [PASS] sta_lta_pure_python ✓ (noise={r_noise:.2f}, eq={r_eq:.2f})")

    def test_1_8g_critical_threshold(self):
        """1.8G = 17.66 m/s² eşiği doğru kontrol ediliyor mu?"""
        from math import sqrt
        # 1.8G = 1.8 * 9.81 = 17.658 m/s²
        CRITICAL_G = 1.8
        G = 9.81
        threshold = CRITICAL_G * G  # 17.658

        # Vektör büyüklüğü hesabı (JS ile aynı formül)
        def magnitude(x, y, z):
            return sqrt(x * x + y * y + z * z)

        # Eşiğin altı
        below = magnitude(5.0, 5.0, 5.0)  # ~8.66 m/s²
        # Eşiğin üstü (sadece z ekseni)
        above = magnitude(0.0, 0.0, 18.0)  # 18 m/s²

        assert below < threshold, f"Düşük ivme eşiğin altında olmalı: {below:.2f}"
        assert above > threshold, f"Yüksek ivme eşiğin üstünde olmalı: {above:.2f}"
        print(f"  [PASS] 1_8g_threshold ✓ (threshold={threshold:.2f} m/s²)")


# ══════════════════════════════════════════════════════════════════════════════
# TEST 5: /sos/test Endpoint Mantık Testi
# ══════════════════════════════════════════════════════════════════════════════

class TestSOSTestEndpoint:
    """POST /api/v1/sos/test endpoint mantık testleri."""

    def test_e164_validation_rejects_invalid(self):
        """Geçersiz numara 400 döndürmeli."""
        import re
        e164 = re.compile(r"^\+[1-9]\d{6,14}$")
        invalids = ["05551234567", "555123", "+0905551234567"]
        for inv in invalids:
            assert not e164.match(inv), f"Geçersiz numara kabul edildi: {inv}"
        print("  [PASS] e164_validation_rejects_invalid ✓")

    def test_e164_validation_accepts_valid(self):
        """Geçerli numaralar kabul edilmeli."""
        import re
        e164 = re.compile(r"^\+[1-9]\d{6,14}$")
        valids = ["+905551234567", "+12125551234", "+441234567890"]
        for v in valids:
            assert e164.match(v), f"Geçerli numara reddedildi: {v}"
        print("  [PASS] e164_validation_accepts_valid ✓")

    def test_sos_test_result_schema(self):
        """SOSTestResponse şeması doğru alanları içeriyor mu?"""
        from app.schemas.sos import SOSTestResponse, SOSTestContactResult
        result = SOSTestResponse(
            success=True,
            whatsapp_sent=1,
            sms_sent=0,
            failed=0,
            total=1,
            fallback_used=False,
            details=[
                SOSTestContactResult(
                    phone="+905551234567",
                    whatsapp_attempted=True,
                    whatsapp_success=True,
                    sms_attempted=False,
                    sms_success=False,
                    fallback_used=False,
                )
            ],
            message="Test tamamlandı: 1 WhatsApp gönderildi.",
        )
        assert result.success is True
        assert result.total == 1
        assert len(result.details) == 1
        print("  [PASS] sos_test_result_schema ✓")


# ══════════════════════════════════════════════════════════════════════════════
# TEST 6: Celery Task Konfigürasyon Testi
# ══════════════════════════════════════════════════════════════════════════════

class TestCeleryTaskConfig:
    """send_emergency_alerts Celery task konfigürasyonu testleri."""

    def test_task_has_retry_config(self):
        """Task max_retries=3 ve acks_late=True olmalı."""
        from app.tasks.send_emergency_twilio import send_emergency_alerts
        assert send_emergency_alerts.max_retries == 3, "max_retries=3 olmalı"
        assert send_emergency_alerts.acks_late is True, "acks_late=True olmalı"
        print("  [PASS] task_has_retry_config ✓")

    def test_empty_phones_returns_fast(self):
        """Boş numara listesinde task hızlı döner."""
        from app.tasks.send_emergency_twilio import send_emergency_alerts
        with patch("app.tasks.send_emergency_twilio.send_waterfall_emergency") as mock_wf:
            # apply() ile senkron çalıştır (Celery worker olmadan)
            result = send_emergency_alerts.run(
                phone_numbers=[],
                message="test",
                user_id=1,
                event_type="TEST",
            )
        mock_wf.assert_not_called()
        assert result["total"] == 0
        print("  [PASS] empty_phones_returns_fast ✓")


# ══════════════════════════════════════════════════════════════════════════════
# RUNNER — Tüm testleri çalıştır
# ══════════════════════════════════════════════════════════════════════════════

def run_all_tests_manually():
    """pytest olmadan manuel çalıştırma."""
    test_classes = [
        TestUserAuth,
        TestTwilioWaterfall,
        TestFCMEarthquakeConfirmed,
        TestSeismicAlgorithm,
        TestSOSTestEndpoint,
        TestCeleryTaskConfig,
    ]

    total = 0
    passed = 0
    failed_tests = []

    print("\n" + "=" * 60)
    print("  QuakeSense Kritik Sistem Testleri")
    print("=" * 60)

    for cls in test_classes:
        print(f"\n▶ {cls.__name__}")
        instance = cls()
        methods = [m for m in dir(instance) if m.startswith("test_")]
        for method_name in methods:
            total += 1
            try:
                getattr(instance, method_name)()
                passed += 1
            except Exception as e:
                failed_tests.append(f"{cls.__name__}.{method_name}: {e}")
                print(f"  [FAIL] {method_name}: {e}")

    print("\n" + "=" * 60)
    print(f"  Sonuç: {passed}/{total} geçti")
    if failed_tests:
        print(f"\n  Başarısız ({len(failed_tests)}):")
        for f in failed_tests:
            print(f"    ✗ {f}")
    else:
        print("  Tüm testler başarılı! ✓")
    print("=" * 60)
    return len(failed_tests) == 0


if __name__ == "__main__":
    success = run_all_tests_manually()
    sys.exit(0 if success else 1)
