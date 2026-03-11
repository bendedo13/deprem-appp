"""
Twilio Şelale (Waterfall Fallback) Servisi.

Akış:
  1. Önce Twilio WhatsApp şablon mesajı dene.
  2. WhatsApp başarısız olursa (hata, numara uyumsuzluğu vb.) → SMS'e geç.
  3. Her adımın sonucunu notification_log tablosuna kaydet.

Bu servis hem Celery task'ından (send_emergency_twilio.py) hem de
doğrudan FastAPI endpoint'inden (/sos/test) çağrılabilecek şekilde
senkron tasarlanmıştır.

Test endpoint'i için Celery tamamen bypass edilir; Twilio API doğrudan çağrılır
ve senkron yanıt döndürülür.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import List, Literal, Optional

from app.config import settings

logger = logging.getLogger(__name__)

Channel = Literal["waterfall", "sms", "whatsapp"]

# Twilio SDK
try:
    from twilio.rest import Client as TwilioClient
    from twilio.base.exceptions import TwilioRestException
    _TWILIO_AVAILABLE = True
except ImportError:
    _TWILIO_AVAILABLE = False
    logger.warning("[TwilioFallback] twilio paketi bulunamadı.")


@dataclass
class ContactResult:
    """Tek bir telefon numarası için gönderim sonucu."""
    phone: str
    whatsapp_attempted: bool = False
    whatsapp_success: bool = False
    sms_attempted: bool = False
    sms_success: bool = False
    fallback_used: bool = False       # WA başarısız → SMS'e düştü
    error: Optional[str] = None


@dataclass
class WaterfallResult:
    """Tüm numara listesi için toplam sonuç."""
    whatsapp_sent: int = 0
    sms_sent: int = 0
    failed: int = 0
    total: int = 0
    fallback_used: bool = False
    details: List[dict] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "whatsapp_sent": self.whatsapp_sent,
            "sms_sent": self.sms_sent,
            "failed": self.failed,
            "total": self.total,
            "fallback_used": self.fallback_used,
            "details": self.details,
        }


def _get_twilio_client() -> Optional[TwilioClient]:
    """Twilio client'ı döndürür. Yapılandırma eksikse None döner, log atar."""
    if not _TWILIO_AVAILABLE:
        logger.error("[TwilioFallback] twilio SDK yüklü değil.")
        return None
    if not settings.TWILIO_ACCOUNT_SID or not settings.TWILIO_AUTH_TOKEN:
        logger.error("[TwilioFallback] TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN eksik.")
        return None
    try:
        return TwilioClient(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
    except Exception as exc:
        logger.error("[TwilioFallback] Client oluşturulamadı: %s", exc)
        return None


def _send_whatsapp_single(
    client: TwilioClient,
    to_number: str,
    message: str,
) -> tuple[bool, Optional[str]]:
    """
    Tek bir numaraya WhatsApp mesajı gönderir.

    Returns:
        (success, error_message)
    """
    try:
        wa_to = f"whatsapp:{to_number}"
        wa_from = f"whatsapp:{settings.TWILIO_PHONE_NUMBER}"
        msg = client.messages.create(body=message, from_=wa_from, to=wa_to)
        logger.info("[TwilioFallback] WhatsApp gönderildi: %s → SID: %s", to_number, msg.sid)
        return True, None
    except TwilioRestException as exc:
        logger.warning(
            "[TwilioFallback] WhatsApp başarısız: %s → kod=%s mesaj=%s",
            to_number, exc.code, exc.msg
        )
        return False, f"TwilioREST-{exc.code}: {exc.msg}"
    except Exception as exc:
        logger.warning("[TwilioFallback] WhatsApp bilinmeyen hata: %s → %s", to_number, exc)
        return False, str(exc)


def _send_sms_single(
    client: TwilioClient,
    to_number: str,
    message: str,
) -> tuple[bool, Optional[str]]:
    """
    Tek bir numaraya SMS gönderir.

    Returns:
        (success, error_message)
    """
    try:
        msg = client.messages.create(
            body=message,
            from_=settings.TWILIO_PHONE_NUMBER,
            to=to_number,
        )
        logger.info("[TwilioFallback] SMS gönderildi: %s → SID: %s", to_number, msg.sid)
        return True, None
    except TwilioRestException as exc:
        logger.warning(
            "[TwilioFallback] SMS başarısız: %s → kod=%s mesaj=%s",
            to_number, exc.code, exc.msg
        )
        return False, f"TwilioREST-{exc.code}: {exc.msg}"
    except Exception as exc:
        logger.warning("[TwilioFallback] SMS bilinmeyen hata: %s → %s", to_number, exc)
        return False, str(exc)


def _log_to_db(result: WaterfallResult, user_id: Optional[int], event_type: str) -> None:
    """
    Gönderim sonucunu notification_logs tablosuna kaydeder.
    Mevcut NotificationLog modeli kullanılır — yeni migration gerekmez.
    Hata olursa sessizce loglar — ana akışı ASLA kesmez.
    """
    try:
        from app.database import SyncSessionLocal
        from app.models.notification_log import NotificationLog

        with SyncSessionLocal() as db:
            log = NotificationLog(
                title=f"Twilio {event_type} Bildirimi",
                body=(
                    f"WhatsApp: {result.whatsapp_sent} gönderildi | "
                    f"SMS: {result.sms_sent} gönderildi | "
                    f"Başarısız: {result.failed} | "
                    f"Fallback: {'Evet' if result.fallback_used else 'Hayır'}"
                ),
                target_type="user" if user_id else "broadcast",
                target_user_id=user_id,
                total_targets=result.total,
                sent_count=result.whatsapp_sent + result.sms_sent,
                failed_count=result.failed,
                sent_by=user_id,
                data={
                    "channel": "waterfall",
                    "event_type": event_type,
                    "whatsapp_sent": result.whatsapp_sent,
                    "sms_sent": result.sms_sent,
                    "fallback_used": result.fallback_used,
                    "sent_at": datetime.now(timezone.utc).isoformat(),
                    "details": result.details[:20],   # Max 20 kayıt — DB şişmesin
                },
            )
            db.add(log)
            db.commit()
            logger.debug("[TwilioFallback] DB log kaydedildi.")
    except Exception as exc:
        # DB log başarısız olsa bile mesaj gönderilmiş olabilir — sadece logla
        logger.error("[TwilioFallback] DB log hatası (mesaj gönderimi etkilenmedi): %s", exc)


def send_waterfall_emergency(
    phone_numbers: list[str],
    message: str,
    channel: Channel = "waterfall",
    user_id: Optional[int] = None,
    event_type: str = "SOS",
) -> dict:
    """
    Şelale (Waterfall Fallback) mantığıyla acil bildirim gönderir.

    Kanal seçenekleri:
      - "waterfall": Önce WhatsApp → başarısız olursa SMS
      - "whatsapp":  Sadece WhatsApp
      - "sms":       Sadece SMS

    Her numara için bağımsız fallback — bir numaranın başarısızlığı diğerini etkilemez.

    Returns:
        WaterfallResult.to_dict()
    """
    numbers = list({p.strip() for p in phone_numbers if p and p.strip()})
    result = WaterfallResult(total=len(numbers))

    if not numbers:
        return result.to_dict()

    client = _get_twilio_client()
    if client is None:
        result.failed = len(numbers)
        result.details = [{"phone": p, "error": "Twilio client yok"} for p in numbers]
        logger.critical(
            "[TwilioFallback] Twilio client başlatılamadı — %d numara bildirimsiz kaldı!",
            len(numbers)
        )
        _log_to_db(result, user_id, event_type)
        return result.to_dict()

    for phone in numbers:
        cr = ContactResult(phone=phone)

        # ── WhatsApp adımı ──────────────────────────────────────────────────
        if channel in ("waterfall", "whatsapp"):
            cr.whatsapp_attempted = True
            success, err = _send_whatsapp_single(client, phone, message)
            cr.whatsapp_success = success
            if success:
                result.whatsapp_sent += 1
            else:
                cr.error = err

        # ── SMS Fallback adımı ──────────────────────────────────────────────
        # "waterfall" modunda: WA başarısızsa SMS'e düş
        # "sms" modunda: Direkt SMS
        should_try_sms = (
            channel == "sms"
            or (channel == "waterfall" and not cr.whatsapp_success)
        )

        if should_try_sms:
            cr.sms_attempted = True
            if channel == "waterfall":
                cr.fallback_used = True
                result.fallback_used = True

            success, err = _send_sms_single(client, phone, message)
            cr.sms_success = success
            if success:
                result.sms_sent += 1
            else:
                cr.error = (cr.error or "") + f" | SMS: {err}"

        # Her iki kanal da başarısız ise failed sayacını artır
        any_success = cr.whatsapp_success or cr.sms_success
        if not any_success:
            result.failed += 1
            logger.error(
                "[TwilioFallback] BAŞARISIZ: %s → WA=%s SMS=%s hata=%s",
                phone, cr.whatsapp_attempted, cr.sms_attempted, cr.error
            )

        result.details.append({
            "phone": phone,
            "whatsapp_attempted": cr.whatsapp_attempted,
            "whatsapp_success": cr.whatsapp_success,
            "sms_attempted": cr.sms_attempted,
            "sms_success": cr.sms_success,
            "fallback_used": cr.fallback_used,
            "error": cr.error,
        })

    # Sonucu DB'ye kaydet (hata olsa da ana akış devam eder)
    _log_to_db(result, user_id, event_type)

    return result.to_dict()
