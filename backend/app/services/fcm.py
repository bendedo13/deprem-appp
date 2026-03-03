"""
Firebase Cloud Messaging (FCM) servisi.
Push bildirim gönderimi için. Firebase Admin SDK kullanır.
"""

import logging
from typing import List, Optional

logger = logging.getLogger(__name__)


async def send_earthquake_push(
    fcm_token: str,
    magnitude: float,
    location: str,
    depth: float,
    occurred_at: str,
) -> bool:
    """
    Tek bir cihaza deprem push bildirimi gönderir.

    Returns:
        True: Başarıyla gönderildi
        False: Gönderim başarısız (Firebase yapılandırması eksik vb.)
    """
    try:
        import firebase_admin
        from firebase_admin import messaging, credentials
        from app.config import settings

        # Firebase uygulaması başlatılmamışsa başlat
        if not firebase_admin._apps:
            import os
            if os.path.exists(settings.FIREBASE_CREDENTIALS_PATH):
                cred = credentials.Certificate(settings.FIREBASE_CREDENTIALS_PATH)
                firebase_admin.initialize_app(cred)
            elif settings.FIREBASE_PROJECT_ID and settings.FIREBASE_PRIVATE_KEY:
                cred = credentials.Certificate({
                    "type": "service_account",
                    "project_id": settings.FIREBASE_PROJECT_ID,
                    "private_key": settings.FIREBASE_PRIVATE_KEY.replace("\\n", "\n"),
                    "client_email": settings.FIREBASE_CLIENT_EMAIL,
                })
                firebase_admin.initialize_app(cred)
            else:
                logger.warning("Firebase yapılandırması eksik, push bildirimi atlandı.")
                return False

        # Bildirim mesajı oluştur
        message = messaging.Message(
            notification=messaging.Notification(
                title=f"🔴 {magnitude:.1f} Büyüklüğünde Deprem!",
                body=f"📍 {location} | Derinlik: {depth:.1f} km",
            ),
            data={
                "magnitude": str(magnitude),
                "location": location,
                "depth": str(depth),
                "occurred_at": occurred_at,
                "type": "earthquake",
            },
            token=fcm_token,
            android=messaging.AndroidConfig(
                priority="high",
                notification=messaging.AndroidNotification(
                    sound="default",
                    channel_id="earthquake_alerts",
                ),
            ),
            apns=messaging.APNSConfig(
                payload=messaging.APNSPayload(
                    aps=messaging.Aps(
                        sound="default",
                        badge=1,
                    )
                )
            ),
        )

        response = messaging.send(message)
        logger.info("FCM push gönderildi: token=...%s response=%s", fcm_token[-8:], response)
        return True

    except Exception as e:
        logger.error("FCM push hatası: %s", e)
        return False


async def send_raw_multicast(
    tokens: List[str],
    title: str,
    body: str,
    data: Optional[dict] = None,
) -> int:
    """
    Birden fazla cihaza aynı anda push bildirimi gönderir (multicast).

    Args:
        tokens: FCM token listesi
        title: Bildirim başlığı
        body: Bildirim içeriği
        data: Ek veri (opsiyonel)

    Returns:
        Başarıyla gönderilen bildirim sayısı
    """
    if not tokens:
        return 0

    try:
        import firebase_admin
        from firebase_admin import messaging, credentials
        from app.config import settings

        # Firebase uygulaması başlatılmamışsa başlat
        if not firebase_admin._apps:
            import os
            if os.path.exists(settings.FIREBASE_CREDENTIALS_PATH):
                cred = credentials.Certificate(settings.FIREBASE_CREDENTIALS_PATH)
                firebase_admin.initialize_app(cred)
            elif settings.FIREBASE_PROJECT_ID and settings.FIREBASE_PRIVATE_KEY:
                cred = credentials.Certificate({
                    "type": "service_account",
                    "project_id": settings.FIREBASE_PROJECT_ID,
                    "private_key": settings.FIREBASE_PRIVATE_KEY.replace("\\n", "\n"),
                    "client_email": settings.FIREBASE_CLIENT_EMAIL,
                })
                firebase_admin.initialize_app(cred)
            else:
                logger.warning("Firebase yapılandırması eksik, multicast atlandı.")
                return 0

        # FCM 500 token limiti var, batch'lere böl
        batch_size = 500
        total_sent = 0

        for i in range(0, len(tokens), batch_size):
            batch_tokens = tokens[i:i + batch_size]

            multicast_message = messaging.MulticastMessage(
                notification=messaging.Notification(
                    title=title,
                    body=body,
                ),
                data=data or {"type": "broadcast"},
                tokens=batch_tokens,
                android=messaging.AndroidConfig(
                    priority="high",
                    notification=messaging.AndroidNotification(
                        sound="default",
                        channel_id="earthquake_alerts",
                    ),
                ),
            )

            response = messaging.send_each_for_multicast(multicast_message)
            total_sent += response.success_count
            logger.info(
                "FCM multicast batch: gönderilen=%d başarılı=%d başarısız=%d",
                len(batch_tokens),
                response.success_count,
                response.failure_count,
            )

        return total_sent

    except ImportError:
        logger.warning("firebase-admin paketi yüklü değil.")
        return 0
    except Exception as e:
        logger.error("FCM multicast hatası: %s", e)
        return 0


async def send_i_am_safe(
    fcm_token: str,
    user_name: str,
    message: str,
) -> bool:
    """
    'Ben İyiyim' bildirimi gönderir.

    Args:
        fcm_token: Hedef cihaz FCM token'ı
        user_name: Kullanıcı adı
        message: Özel mesaj

    Returns:
        True: Başarıyla gönderildi
    """
    try:
        import firebase_admin
        from firebase_admin import messaging
        from app.config import settings

        if not firebase_admin._apps:
            logger.warning("Firebase başlatılmamış, i_am_safe bildirimi atlandı.")
            return False

        msg = messaging.Message(
            notification=messaging.Notification(
                title=f"✅ {user_name} Güvende!",
                body=message,
            ),
            data={
                "type": "i_am_safe",
                "user_name": user_name,
                "message": message,
            },
            token=fcm_token,
        )

        messaging.send(msg)
        logger.info("Ben İyiyim bildirimi gönderildi: user=%s", user_name)
        return True

    except Exception as e:
        logger.error("Ben İyiyim FCM hatası: %s", e)
        return False