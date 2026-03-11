"""
Celery task — Acil kişilere Twilio Şelale (Fallback) mimarisiyle mesaj gönderimi.

Şelale Akışı (Waterfall):
  Adım 1: WhatsApp şablon mesajı gönder.
  Adım 2: Eğer WhatsApp başarısız olursa (veya hiç gönderilmediyse) → SMS'e geç.
  Adım 3: Her adımın sonucunu veritabanına logla (silent fail asla yapılmaz).

Bu mimari, internet yerine SMS altyapısı çalıştığı sürece (GSM kapsama alanı)
acil bildirimin ulaşmasını garanti eder.
"""

import logging
from typing import List

from app.tasks.celery_app import celery_app
from app.services.twilio_fallback import send_waterfall_emergency

logger = logging.getLogger(__name__)


@celery_app.task(
    bind=True,
    name="app.tasks.send_emergency_twilio.send_emergency_alerts",
    max_retries=3,
    default_retry_delay=10,
    acks_late=True,          # Görev tamamlanana kadar queue'dan silinmez
    reject_on_worker_lost=True,
)
def send_emergency_alerts(
    self,
    phone_numbers: List[str],
    message: str,
    channel: str = "waterfall",
    user_id: int | None = None,
    event_type: str = "SOS",
) -> dict:
    """
    Acil kişilere Twilio üzerinden Şelale (Fallback) mantığıyla mesaj gönderir.

    Args:
        phone_numbers: E.164 formatında telefon numaraları (+905551234567)
        message: Gönderilecek mesaj metni
        channel: "waterfall" (varsayılan) | "sms" | "whatsapp"
        user_id: İsteği başlatan kullanıcı ID'si (log için)
        event_type: "SOS" | "EARTHQUAKE_EARLY_WARNING" | "TEST"

    Returns:
        {
            "whatsapp_sent": int,
            "sms_sent": int,
            "failed": int,
            "total": int,
            "fallback_used": bool,   # WhatsApp başarısız → SMS'e düştü mü?
            "details": list[dict],   # Her numara için detay
        }
    """
    if not phone_numbers:
        logger.warning(
            "[Twilio Waterfall] Boş numara listesi. user_id=%s event=%s",
            user_id, event_type
        )
        return {
            "whatsapp_sent": 0, "sms_sent": 0,
            "failed": 0, "total": 0,
            "fallback_used": False, "details": []
        }

    try:
        result = send_waterfall_emergency(
            phone_numbers=phone_numbers,
            message=message,
            channel=channel,
            user_id=user_id,
            event_type=event_type,
        )
        logger.info(
            "[Twilio Waterfall] TAMAMLANDI: "
            "user_id=%s event=%s total=%d whatsapp=%d sms=%d failed=%d fallback=%s",
            user_id, event_type,
            result["total"], result["whatsapp_sent"],
            result["sms_sent"], result["failed"],
            result["fallback_used"],
        )
        return result

    except Exception as exc:
        logger.error(
            "[Twilio Waterfall] KRİTİK HATA — user_id=%s event=%s hata=%s",
            user_id, event_type, exc,
            exc_info=True,
        )
        # Retry mekanizması — 3 denemeye kadar
        try:
            raise self.retry(exc=exc)
        except self.MaxRetriesExceededError:
            logger.critical(
                "[Twilio Waterfall] MAX RETRY AŞILDI — user_id=%s event=%s. "
                "Bildirim gönderilemedi!",
                user_id, event_type,
            )
            return {
                "whatsapp_sent": 0, "sms_sent": 0,
                "failed": len(phone_numbers), "total": len(phone_numbers),
                "fallback_used": False, "details": [],
                "error": str(exc),
            }
