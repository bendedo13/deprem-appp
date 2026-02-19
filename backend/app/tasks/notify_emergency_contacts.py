"""
Deprem doğrulandığında risk bölgesindeki kullanıcıların acil kişilerine
'Şu konumda depreme yakalandım' bildirimi gönderen Celery task.
FCM data payload (EARTHQUAKE_CONFIRMED) da bu task içinde bölge kullanıcılarına atılır.
"""

import logging
from typing import List, Tuple

from sqlalchemy.orm import Session

from app.database import SyncSessionLocal
from app.models.user import User
from app.models.emergency_contact import EmergencyContact
from app.utils.geo import haversine_distance_km
from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)

# Bölge yarıçapı (km) — config'den okunabilir, worker'da settings import dikkatli olmalı
RADIUS_KM = 10.0


def _users_in_radius(
    session: Session, latitude: float, longitude: float, radius_km: float = RADIUS_KM
) -> List[User]:
    """Verilen koordinata radius_km içinde konumu olan kullanıcıları döndürür."""
    users = session.query(User).filter(
        User.latitude.isnot(None),
        User.longitude.isnot(None),
    ).all()
    in_radius = []
    for u in users:
        if u.latitude is None or u.longitude is None:
            continue
        if haversine_distance_km(latitude, longitude, u.latitude, u.longitude) <= radius_km:
            in_radius.append(u)
    return in_radius


@celery_app.task(bind=True, name="app.tasks.notify_emergency_contacts.handle_confirmed_earthquake")
def handle_confirmed_earthquake(
    self,
    latitude: float,
    longitude: float,
    geohash: str,
    timestamp_iso: str,
    device_count: int,
) -> None:
    """
    Deprem doğrulandığında çağrılır. Bölgedeki kullanıcılara FCM gönderir,
    her kullanıcının acil kişilerine 'depreme yakalandım' mesajı iletir.
    """
    with SyncSessionLocal() as session:
        try:
            users = _users_in_radius(session, latitude, longitude)
            logger.info("Doğrulanan deprem: bölgede %s kullanıcı", len(users))

            for user in users:
                _send_fcm_earthquake_confirmed(user, latitude, longitude, timestamp_iso, device_count)
                for contact in user.emergency_contacts:
                    _notify_emergency_contact(contact, user, latitude, longitude, timestamp_iso)
        except Exception as e:
            logger.exception("handle_confirmed_earthquake hatası: %s", e)
            raise


def _send_fcm_earthquake_confirmed(
    user: User,
    latitude: float,
    longitude: float,
    timestamp_iso: str,
    device_count: int,
) -> None:
    """Kullanıcıya FCM ile EARTHQUAKE_CONFIRMED data payload gönderir."""
    if not user.fcm_token:
        return
    try:
        from firebase_admin import messaging
        message = messaging.Message(
            data={
                "type": "EARTHQUAKE_CONFIRMED",
                "latitude": str(latitude),
                "longitude": str(longitude),
                "timestamp": timestamp_iso,
                "device_count": str(device_count),
            },
            token=user.fcm_token,
            android=messaging.AndroidConfig(
                priority="high",
                notification=messaging.AndroidNotification(
                    channel_id="earthquake_alarm",
                    priority="max",
                ),
            ),
            apns=messaging.APNSConfig(
                payload=messaging.APNSPayload(
                    aps=messaging.Aps(content_available=True, sound="default"),
                ),
                fcm_options=messaging.APNSFCMOptions(analytics_label="earthquake_confirmed"),
            ),
        )
        messaging.send(message)
        logger.info("FCM EARTHQUAKE_CONFIRMED gönderildi: user_id=%s", user.id)
    except ImportError:
        logger.warning("firebase_admin yok, FCM atlanıyor")
    except Exception as e:
        logger.error("FCM gönderme hatası: %s", e)


def _notify_emergency_contact(
    contact: EmergencyContact,
    user: User,
    latitude: float,
    longitude: float,
    timestamp_iso: str,
) -> None:
    """Acil kişiye 'Kullanıcı X şu konumda depreme yakalandı' mesajı iletir."""
    message = (
        f"{user.email} şu konumda depreme yakalandı: "
        f"https://maps.google.com/?q={latitude},{longitude} ({timestamp_iso})"
    )
    try:
        if contact.channel == "sms" and contact.phone:
            _send_sms(contact.phone, message)
        elif contact.channel == "email" and contact.email:
            _send_email(contact.email, "Deprem bildirimi", message)
        else:
            # Push veya varsayılan: e-posta
            if contact.email:
                _send_email(contact.email, "Deprem bildirimi", message)
    except Exception as e:
        logger.error("Acil kişi bildirimi hatası (contact_id=%s): %s", contact.id, e)


def _send_sms(phone: str, body: str) -> None:
    """SMS gönderimi (entegrasyon: Twilio vb.). Şimdilik log."""
    logger.info("SMS (stub) -> %s: %s", phone[:6], body[:80])


def _send_email(to: str, subject: str, body: str) -> None:
    """E-posta gönderimi (SMTP). Şimdilik log."""
    logger.info("Email (stub) -> %s: %s", to, subject)
