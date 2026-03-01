"""
Twilio SMS/WhatsApp servisi.
Acil iletişim kişilerine SMS ve WhatsApp mesajı gönderir.
rules.md: API key/secret asla kodda olmaz — .env'den gelir.
"""

import logging
from typing import Optional

from app.config import settings

logger = logging.getLogger(__name__)


class TwilioService:
    """Twilio SMS ve WhatsApp gönderim servisi."""

    def __init__(self) -> None:
        self._client = None
        self._enabled = bool(
            settings.TWILIO_ACCOUNT_SID
            and settings.TWILIO_AUTH_TOKEN
            and settings.TWILIO_PHONE_NUMBER
        )
        if self._enabled:
            try:
                from twilio.rest import Client
                self._client = Client(
                    settings.TWILIO_ACCOUNT_SID,
                    settings.TWILIO_AUTH_TOKEN,
                )
                logger.info("Twilio servisi başlatıldı.")
            except ImportError:
                logger.warning("twilio paketi yüklü değil. SMS devre dışı.")
                self._enabled = False
            except Exception as exc:
                logger.error("Twilio başlatma hatası: %s", exc)
                self._enabled = False
        else:
            logger.warning(
                "Twilio yapılandırması eksik (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, "
                "TWILIO_PHONE_NUMBER). SMS gönderimi devre dışı."
            )

    async def send_sms(self, to_phone: str, message: str) -> bool:
        """
        SMS gönderir.

        Args:
            to_phone: Alıcı telefon numarası (E.164 formatı: +905xxxxxxxxx)
            message: Gönderilecek mesaj metni

        Returns:
            True: Başarılı, False: Başarısız veya devre dışı
        """
        if not self._enabled or not self._client:
            logger.warning("Twilio devre dışı — SMS gönderilmedi: %s", to_phone)
            return False

        try:
            # Telefon numarasını E.164 formatına çevir
            formatted_phone = self._format_phone(to_phone)
            if not formatted_phone:
                logger.warning("Geçersiz telefon numarası: %s", to_phone)
                return False

            msg = self._client.messages.create(
                body=message,
                from_=settings.TWILIO_PHONE_NUMBER,
                to=formatted_phone,
            )
            logger.info("SMS gönderildi: to=%s sid=%s", formatted_phone, msg.sid)
            return True

        except Exception as exc:
            logger.error("SMS gönderme hatası (to=%s): %s", to_phone, exc)
            return False

    async def send_whatsapp(self, to_phone: str, message: str) -> bool:
        """
        WhatsApp mesajı gönderir.

        Args:
            to_phone: Alıcı telefon numarası
            message: Gönderilecek mesaj metni

        Returns:
            True: Başarılı, False: Başarısız veya devre dışı
        """
        if not self._enabled or not self._client:
            logger.warning("Twilio devre dışı — WhatsApp gönderilmedi: %s", to_phone)
            return False

        if not settings.TWILIO_WHATSAPP_NUMBER:
            logger.warning("TWILIO_WHATSAPP_NUMBER tanımlı değil.")
            return False

        try:
            formatted_phone = self._format_phone(to_phone)
            if not formatted_phone:
                logger.warning("Geçersiz telefon numarası: %s", to_phone)
                return False

            msg = self._client.messages.create(
                body=message,
                from_=f"whatsapp:{settings.TWILIO_WHATSAPP_NUMBER}",
                to=f"whatsapp:{formatted_phone}",
            )
            logger.info("WhatsApp gönderildi: to=%s sid=%s", formatted_phone, msg.sid)
            return True

        except Exception as exc:
            logger.error("WhatsApp gönderme hatası (to=%s): %s", to_phone, exc)
            return False

    def _format_phone(self, phone: str) -> Optional[str]:
        """
        Telefon numarasını E.164 formatına çevirir.
        Türkiye numaraları için 0 ile başlayanları +90 ile değiştirir.
        """
        cleaned = phone.strip().replace(" ", "").replace("-", "")
        if not cleaned:
            return None
        # Zaten E.164 formatındaysa olduğu gibi döndür
        if cleaned.startswith("+"):
            return cleaned
        # Türkiye: 05xx → +905xx
        if cleaned.startswith("0") and len(cleaned) == 11:
            return f"+9{cleaned}"
        # Başında ülke kodu yoksa +90 ekle
        if len(cleaned) == 10:
            return f"+90{cleaned}"
        return cleaned


# Singleton instance
_twilio_service: Optional[TwilioService] = None


def get_twilio_service() -> TwilioService:
    """Twilio servis singleton döndürür."""
    global _twilio_service
    if _twilio_service is None:
        _twilio_service = TwilioService()
    return _twilio_service