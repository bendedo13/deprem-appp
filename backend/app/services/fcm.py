"""
Firebase Cloud Messaging (FCM) push bildirim servisi.
rules.md: API key/secret asla kodda olmaz — .env'den gelir.
"""

import logging
from typing import List, Optional

from app.config import settings

logger = logging.getLogger(__name__)


def _get_firebase_app():
    """Firebase Admin SDK uygulamasını döndürür. Yapılandırma eksikse None."""
    try:
        import firebase_admin
        from firebase_admin import credentials

        # Zaten başlatılmışsa mevcut uygulamayı döndür
        try:
            return firebase_admin.get_app()
        except ValueError:
            pass

        # Credentials dosyası varsa kullan
        import os
        cred_path = settings.FIREBASE_CREDENTIALS_PATH
        if os.path.exists(cred_path):
            cred = credentials.Certificate(cred_path)
            return firebase_admin.initialize_app(cred)

        # Ortam değişkenlerinden yapılandır
        if settings.FIREBASE_PROJECT_ID and settings.FIREBASE_PRIVATE_KEY and settings.FIREBASE_CLIENT_EMAIL:
            cred = credentials.Certificate({
                "type": "service_account",
                "project_id": settings.FIREBASE_PROJECT_ID,
                "private_key": settings.FIREBASE_PRIVATE_KEY.replace("\\n", "\n"),
                "client_email": settings.FIREBASE_CLIENT_EMAIL,
                "token_uri": "https://oauth2.googleapis.com/token",
            })
            return firebase_admin.initialize_app(cred)

        logger.warning("Firebase yapılandırması eksik — push bildirimler devre dışı.")
        return None

    except ImportError:
        logger.warning("firebase-admin paketi yüklü değil. Push bildirimler devre dışı.")
        return None
    except Exception as exc:
        logger.error("Firebase başlatma hatası: %s", exc)
        return None


async def send_earthquake_push(
    fcm_token: str,
    magnitude: float,
    location: str,
    depth: float,
    occurred_at: str,
) -> bool:
    """
    Tek bir cihaza deprem push bildirimi gönderir.

    Args:
        fcm_token: Hedef cihaz FCM token'ı
        magnitude: Deprem büyüklüğü
        location: Deprem konumu
        depth: Derinlik (km)
        occurred_at: Deprem zamanı (ISO 8601)

    Returns:
        True: Başarılı, False: Başarısız
    """
    app = _get_firebase_app()
    if not app:
        logger.warning("Firebase yapılandırılmamış — push bildirimi atlandı.")
        return False

    try:
        from firebase_admin import messaging

        message = messaging.Message(
            notification=messaging.Notification(
                title=f"🚨 {magnitude:.1f} Büyüklüğünde Deprem!",
                body=f"{location} — Derinlik: {depth:.0f} km",
            ),
            data={
                "type": "EARTHQUAKE",
                "magnitude": str(magnitude),
                "location": location,
                "depth": str(depth),
                "occurred_at": occurred_at,
            },
            token=fcm_token,
            android=messaging.AndroidConfig(priority="high"),
            apns=messaging.APNSConfig(
                payload=messaging.APNSPayload(
                    aps=messaging.Aps(sound="default", badge=1)
                )
            ),
        )
        response = messaging.send(message)
        logger.info("Push bildirimi gönderildi: %s", response)
        return True

    except Exception as exc:
        logger.error("Push bildirimi gönderilemedi: %s", exc)
        return False


async def send_i_am_safe(
    fcm_tokens: List[str],
    user_name: str,
    message: str,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
) -> int:
    """
    'Ben İyiyim' bildirimini birden fazla cihaza gönderir.

    Args:
        fcm_tokens: Hedef cihaz FCM token listesi
        user_name: Gönderen kullanıcı adı
        message: Özel mesaj
        latitude: Konum enlemi (opsiyonel)
        longitude: Konum boylamı (opsiyonel)

    Returns:
        Başarıyla gönderilen bildirim sayısı
    """
    if not fcm_tokens:
        return 0

    app = _get_firebase_app()
    if not app:
        logger.warning("Firebase yapılandırılmamış — 'Ben İyiyim' bildirimi atlandı.")
        return 0

    try:
        from firebase_admin import messaging

        data = {
            "type": "I_AM_SAFE",
            "user_name": user_name,
            "message": message,
        }
        if latitude is not None and longitude is not None:
            data["latitude"] = str(latitude)
            data["longitude"] = str(longitude)

        messages = [
            messaging.Message(
                notification=messaging.Notification(
                    title=f"✅ {user_name} Güvende!",
                    body=message,
                ),
                data=data,
                token=token,
                android=messaging.AndroidConfig(priority="high"),
                apns=messaging.APNSConfig(
                    payload=messaging.APNSPayload(
                        aps=messaging.Aps(sound="default")
                    )
                ),
            )
            for token in fcm_tokens
        ]

        # Toplu gönderim (max 500 mesaj/istek)
        sent_count = 0
        batch_size = 500
        for i in range(0, len(messages), batch_size):
            batch = messages[i:i + batch_size]
            response = messaging.send_each(batch)
            sent_count += response.success_count
            if response.failure_count > 0:
                logger.warning(
                    "'Ben İyiyim' batch gönderim: %d başarılı, %d başarısız",
                    response.success_count,
                    response.failure_count,
                )

        logger.info("'Ben İyiyim' bildirimi gönderildi: %d/%d", sent_count, len(fcm_tokens))
        return sent_count

    except Exception as exc:
        logger.error("'Ben İyiyim' push bildirimi hatası: %s", exc)
        return 0


async def send_raw_multicast(tokens: List[str], title: str, body: str) -> int:
    """
    Ham çoklu push bildirimi gönderir (admin broadcast için).

    Args:
        tokens: FCM token listesi
        title: Bildirim başlığı
        body: Bildirim içeriği

    Returns:
        Başarıyla gönderilen bildirim sayısı
    """
    if not tokens:
        return 0

    app = _get_firebase_app()
    if not app:
        logger.warning("Firebase yapılandırılmamış — broadcast atlandı.")
        return 0

    try:
        from firebase_admin import messaging

        messages = [
            messaging.Message(
                notification=messaging.Notification(title=title, body=body),
                token=token,
            )
            for token in tokens
        ]

        sent_count = 0
        batch_size = 500
        for i in range(0, len(messages), batch_size):
            batch = messages[i:i + batch_size]
            response = messaging.send_each(batch)
            sent_count += response.success_count

        logger.info("Broadcast gönderildi: %d/%d", sent_count, len(tokens))
        return sent_count

    except Exception as exc:
        logger.error("Broadcast push hatası: %s", exc)
        return 0