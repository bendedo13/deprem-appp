"""
Firebase Cloud Messaging (FCM) push bildirim servisi.
Deprem uyarıları ve 'Ben İyiyim' bildirimleri için kullanılır.
"""

import logging
from typing import List, Optional

from app.config import settings

logger = logging.getLogger(__name__)


class FCMService:
    """
    Firebase Cloud Messaging servisi.
    Credentials eksikse mock modda çalışır.
    """

    def __init__(self) -> None:
        self._app = None
        self._initialized = False
        self._try_initialize()

    def _try_initialize(self) -> None:
        """Firebase Admin SDK'yı başlatmaya çalışır."""
        try:
            import firebase_admin
            from firebase_admin import credentials, messaging

            # Zaten başlatılmışsa tekrar başlatma
            if firebase_admin._apps:
                self._app = firebase_admin.get_app()
                self._initialized = True
                return

            # Credentials dosyasından yükle
            import os
            cred_path = settings.FIREBASE_CREDENTIALS_PATH
            if os.path.exists(cred_path):
                cred = credentials.Certificate(cred_path)
                self._app = firebase_admin.initialize_app(cred)
                self._initialized = True
                logger.info("Firebase Admin SDK başlatıldı (dosyadan).")
                return

            # Ortam değişkenlerinden yükle
            if settings.FIREBASE_PROJECT_ID and settings.FIREBASE_PRIVATE_KEY and settings.FIREBASE_CLIENT_EMAIL:
                cred_dict = {
                    "type": "service_account",
                    "project_id": settings.FIREBASE_PROJECT_ID,
                    "private_key": settings.FIREBASE_PRIVATE_KEY.replace("\\n", "\n"),
                    "client_email": settings.FIREBASE_CLIENT_EMAIL,
                    "token_uri": "https://oauth2.googleapis.com/token",
                }
                cred = credentials.Certificate(cred_dict)
                self._app = firebase_admin.initialize_app(cred)
                self._initialized = True
                logger.info("Firebase Admin SDK başlatıldı (env vars).")
                return

            logger.warning(
                "Firebase credentials bulunamadı. Push bildirimler devre dışı. "
                "FIREBASE_CREDENTIALS_PATH veya FIREBASE_PROJECT_ID/PRIVATE_KEY/CLIENT_EMAIL ayarlayın."
            )

        except ImportError:
            logger.warning("firebase-admin kütüphanesi yüklü değil. 'pip install firebase-admin' çalıştırın.")
        except Exception as exc:
            logger.error("Firebase başlatma hatası: %s", exc)

    @property
    def is_available(self) -> bool:
        """FCM servisinin kullanılabilir olup olmadığını döner."""
        return self._initialized

    async def send_push(
        self,
        fcm_token: str,
        title: str,
        body: str,
        data: Optional[dict] = None,
    ) -> bool:
        """
        Tek bir cihaza push bildirim gönderir.

        Args:
            fcm_token: Hedef cihaz FCM token'ı
            title: Bildirim başlığı
            body: Bildirim içeriği
            data: Ek veri (key-value string pairs)

        Returns:
            True: Başarılı, False: Başarısız
        """
        if not self.is_available:
            logger.warning("FCM mevcut değil. Push gönderilemedi: %s", title)
            return False

        try:
            from firebase_admin import messaging

            # Data değerlerini string'e dönüştür (FCM zorunluluğu)
            str_data = {k: str(v) for k, v in (data or {}).items()}

            message = messaging.Message(
                notification=messaging.Notification(title=title, body=body),
                data=str_data,
                token=fcm_token,
                android=messaging.AndroidConfig(
                    priority="high",
                    notification=messaging.AndroidNotification(
                        sound="earthquake_alert",
                        channel_id="earthquake_alerts",
                    ),
                ),
                apns=messaging.APNSConfig(
                    payload=messaging.APNSPayload(
                        aps=messaging.Aps(sound="earthquake_alert.caf", badge=1)
                    )
                ),
            )

            response = messaging.send(message)
            logger.info("FCM push gönderildi: message_id=%s", response)
            return True

        except Exception as exc:
            logger.error("FCM push hatası: %s", exc)
            return False

    async def send_multicast(
        self,
        tokens: List[str],
        title: str,
        body: str,
        data: Optional[dict] = None,
    ) -> int:
        """
        Birden fazla cihaza push bildirim gönderir.

        Args:
            tokens: Hedef FCM token listesi
            title: Bildirim başlığı
            body: Bildirim içeriği
            data: Ek veri

        Returns:
            Başarıyla gönderilen bildirim sayısı
        """
        if not self.is_available:
            logger.warning("FCM mevcut değil. Multicast gönderilemedi.")
            return 0

        if not tokens:
            return 0

        try:
            from firebase_admin import messaging

            str_data = {k: str(v) for k, v in (data or {}).items()}

            # FCM multicast max 500 token
            total_sent = 0
            for i in range(0, len(tokens), 500):
                batch = tokens[i:i + 500]
                message = messaging.MulticastMessage(
                    notification=messaging.Notification(title=title, body=body),
                    data=str_data,
                    tokens=batch,
                    android=messaging.AndroidConfig(priority="high"),
                )
                response = messaging.send_each_for_multicast(message)
                total_sent += response.success_count
                logger.info(
                    "FCM multicast batch: success=%d, failure=%d",
                    response.success_count,
                    response.failure_count
                )

            return total_sent

        except Exception as exc:
            logger.error("FCM multicast hatası: %s", exc)
            return 0


# Singleton instance
_fcm_service: Optional[FCMService] = None


def get_fcm_service() -> FCMService:
    """FCM servis singleton döndürür."""
    global _fcm_service
    if _fcm_service is None:
        _fcm_service = FCMService()
    return _fcm_service


# ── Yardımcı fonksiyonlar (geriye dönük uyumluluk) ──────────────────────────

async def send_earthquake_push(
    fcm_token: str,
    magnitude: float,
    location: str,
    depth: float,
    occurred_at: str,
) -> bool:
    """Deprem uyarısı push bildirimi gönderir."""
    service = get_fcm_service()
    return await service.send_push(
        fcm_token=fcm_token,
        title=f"🚨 {magnitude:.1f} Büyüklüğünde Deprem!",
        body=f"{location} - Derinlik: {depth:.1f} km",
        data={
            "type": "EARTHQUAKE",
            "magnitude": str(magnitude),
            "location": location,
            "depth": str(depth),
            "occurred_at": occurred_at,
        },
    )


async def send_i_am_safe(fcm_token: str, user_name: str, message: str) -> bool:
    """'Ben İyiyim' push bildirimi gönderir."""
    service = get_fcm_service()
    return await service.send_push(
        fcm_token=fcm_token,
        title=f"✅ {user_name} Güvende!",
        body=message,
        data={"type": "I_AM_SAFE", "user_name": user_name},
    )


async def send_raw_multicast(tokens: List[str], title: str, body: str) -> int:
    """Ham multicast push bildirimi gönderir (admin broadcast için)."""
    service = get_fcm_service()
    return await service.send_multicast(tokens=tokens, title=title, body=body)