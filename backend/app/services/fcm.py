"""
FCM (Firebase Cloud Messaging) push bildirim servisi.
Deprem uyarısı ve test bildirimleri için kullanılır.
Firebase Admin SDK yapılandırması config'den okunur.
"""

import json
import logging
from typing import Optional

from app.config import settings

logger = logging.getLogger(__name__)

# Firebase Admin SDK — opsiyonel, yoksa FCM sessizce atlanır
try:
    import firebase_admin
    from firebase_admin import credentials, messaging
    _FIREBASE_AVAILABLE = True
except ImportError:
    _FIREBASE_AVAILABLE = False
    logger.warning("firebase_admin paketi bulunamadı. FCM bildirimleri devre dışı.")


def _init_firebase() -> bool:
    """
    Firebase Admin SDK'yı bir kez başlatır.
    Config'den Firebase credentials kullanır.

    Returns:
        True → başarılı, False → SDK yok veya hata.
    """
    if not _FIREBASE_AVAILABLE:
        return False
    if firebase_admin._apps:
        return True  # Zaten başlatıldı

    # Config'den credentials oku
    if not settings.FIREBASE_PROJECT_ID or not settings.FIREBASE_PRIVATE_KEY or not settings.FIREBASE_CLIENT_EMAIL:
        logger.warning("Firebase yapılandırması eksik. FCM bildirimleri atlanacak.")
        return False

    try:
        # Firebase credentials oluştur
        cred_dict = {
            "type": "service_account",
            "project_id": settings.FIREBASE_PROJECT_ID,
            "private_key": settings.FIREBASE_PRIVATE_KEY.replace('\\n', '\n'),  # Escape karakterlerini düzelt
            "client_email": settings.FIREBASE_CLIENT_EMAIL,
            "token_uri": "https://oauth2.googleapis.com/token",
        }
        cred = credentials.Certificate(cred_dict)
        firebase_admin.initialize_app(cred)
        logger.info("Firebase Admin SDK başlatıldı.")
        return True
    except Exception as exc:
        logger.error("Firebase başlatma hatası: %s", exc)
        return False


async def send_earthquake_push(
    fcm_token: str,
    magnitude: float,
    location: str,
    depth: float,
    occurred_at: str,
) -> bool:
    """
    Tek bir FCM token'a deprem push bildirimi gönderir.

    Args:
        fcm_token: Kullanıcının FCM cihaz token'ı.
        magnitude: Deprem şiddeti.
        location: Deprem yeri.
        depth: Derinlik (km).
        occurred_at: ISO 8601 format deprem zamanı.

    Returns:
        True → bildirim gönderildi, False → hata veya SDK yok.
    """
    if not _init_firebase():
        return False
    try:
        title = f"🔴 Deprem M{magnitude:.1f}"
        body = f"{location} — Derinlik: {depth:.0f} km"

        message = messaging.Message(
            notification=messaging.Notification(title=title, body=body),
            data={
                "type": "NEW_EARTHQUAKE",
                "magnitude": str(magnitude),
                "location": location,
                "depth": str(depth),
                "occurred_at": occurred_at,
            },
            token=fcm_token,
            android=messaging.AndroidConfig(
                priority="high",
                notification=messaging.AndroidNotification(
                    channel_id="earthquake_alerts",
                    priority="max",
                    sound="earthquake_alarm",
                ),
            ),
            apns=messaging.APNSConfig(
                payload=messaging.APNSPayload(
                    aps=messaging.Aps(
                        alert=messaging.ApsAlert(title=title, body=body),
                        sound="earthquake_alarm.caf",
                        content_available=True,
                    )
                ),
            ),
        )
        response = messaging.send(message)
        logger.info("FCM bildirim gönderildi: %s → %s", fcm_token[:12], response)
        return True
    except Exception as exc:
        logger.error("FCM gönderme hatası: %s", exc)
        return False


async def send_earthquake_push_multicast(
    fcm_tokens: list[str],
    magnitude: float,
    location: str,
    depth: float,
    occurred_at: str,
) -> int:
    """
    Birden fazla FCM token'a aynı anda deprem bildirimi gönderir (multicast).

    Returns:
        Başarıyla gönderilen bildirim sayısı.
    """
    if not fcm_tokens or not _init_firebase():
        return 0
    try:
        title = f"🔴 Deprem M{magnitude:.1f}"
        body = f"{location} — Derinlik: {depth:.0f} km"

        message = messaging.MulticastMessage(
            notification=messaging.Notification(title=title, body=body),
            data={
                "type": "NEW_EARTHQUAKE",
                "magnitude": str(magnitude),
                "location": location,
                "depth": str(depth),
                "occurred_at": occurred_at,
            },
            tokens=fcm_tokens[:500],  # FCM max 500 token/istek
            android=messaging.AndroidConfig(
                priority="high",
                notification=messaging.AndroidNotification(
                    channel_id="earthquake_alerts",
                    priority="max",
                ),
            ),
        )
        response = messaging.send_each_for_multicast(message)
        logger.info(
            "FCM multicast: %d başarılı / %d başarısız",
            response.success_count,
            response.failure_count,
        )
        return response.success_count
    except Exception as exc:
        logger.error("FCM multicast hatası: %s", exc)
        return 0


async def send_i_am_safe(
    sender_email: str,
    latitude: float | None,
    longitude: float | None,
    fcm_tokens: list[str],
) -> int:
    """
    "Ben İyiyim" bildirimi — acil kişilerin FCM token'larına push gönderir.

    Args:
        sender_email: Bildirimi gönderen kullanıcının e-postası.
        latitude/longitude: Kullanıcının konumu (opsiyonel).
        fcm_tokens: Acil kişilerin FCM token listesi.

    Returns:
        Başarıyla gönderilen bildirim sayısı.
    """
    if not fcm_tokens or not _init_firebase():
        return 0

    title = "✅ İyi Haber!"
    body = f"{sender_email} depremden etkilenmedi, iyiyim dedi."
    location_str = (
        f"{latitude:.4f}, {longitude:.4f}" if (latitude and longitude) else "bilinmiyor"
    )

    try:
        message = messaging.MulticastMessage(
            notification=messaging.Notification(title=title, body=body),
            data={
                "type": "I_AM_SAFE",
                "sender": sender_email,
                "location": location_str,
            },
            tokens=fcm_tokens[:500],
            android=messaging.AndroidConfig(priority="normal"),
        )
        response = messaging.send_each_for_multicast(message)
        logger.info(
            "Ben İyiyim FCM: %s → %d başarılı / %d başarısız",
            sender_email,
            response.success_count,
            response.failure_count,
        )
        return response.success_count
    except Exception as exc:
        logger.error("Ben İyiyim FCM hatası: %s", exc)
        return 0
