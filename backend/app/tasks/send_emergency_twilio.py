"""
Celery task — Acil kişilere Twilio SMS + WhatsApp gönderimi.
S.O.S ve Erken Uyarı tetiklendiğinde bu task kuyruğa atılır.
"""

import logging
from typing import List

from app.tasks.celery_app import celery_app
from app.services.sos_service import send_hybrid_via_twilio_sync

logger = logging.getLogger(__name__)


@celery_app.task(bind=True, name="app.tasks.send_emergency_twilio.send_emergency_alerts")
def send_emergency_alerts(
    self,
    phone_numbers: List[str],
    message: str,
    channel: str = "hybrid",
) -> dict:
    """
    Acil kişilere Twilio üzerinden SMS ve WhatsApp mesajı gönderir.

    Args:
        phone_numbers: E.164 formatında telefon numaraları (+905551234567)
        message: Gönderilecek mesaj metni
        channel: "sms" | "whatsapp" | "hybrid"

    Returns:
        sms_sent, whatsapp_sent sayıları
    """
    if not phone_numbers:
        logger.warning("send_emergency_alerts: boş numara listesi")
        return {"sms_sent": 0, "whatsapp_sent": 0}

    try:
        result = send_hybrid_via_twilio_sync(phone_numbers, message, channel=channel)
        logger.info(
            "Emergency Twilio: sms=%d whatsapp=%d contacts=%d",
            result["sms_sent"],
            result["whatsapp_sent"],
            len(phone_numbers),
        )
        return result
    except Exception as exc:
        logger.error("Emergency Twilio hatası: %s", exc)
        raise
