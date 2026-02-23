"""
Twilio SMS/WhatsApp servisi.
Acil durumlarda emergency contacts'a SMS ve WhatsApp mesajı gönderir.
"""

import logging
from typing import List, Optional

from app.config import settings

logger = logging.getLogger(__name__)

# Twilio SDK — opsiyonel
try:
    from twilio.rest import Client
    from twilio.base.exceptions import TwilioRestException
    _TWILIO_AVAILABLE = True
except ImportError:
    _TWILIO_AVAILABLE = False
    logger.warning("twilio paketi bulunamadı. SMS/WhatsApp bildirimleri devre dışı.")


class TwilioService:
    """Twilio SMS ve WhatsApp mesaj gönderme servisi."""

    def __init__(self):
        self.client: Optional[Client] = None
        self.from_number = settings.TWILIO_PHONE_NUMBER
        self._init_client()

    def _init_client(self) -> bool:
        """Twilio client'ı başlatır."""
        if not _TWILIO_AVAILABLE:
            return False

        if not settings.TWILIO_ACCOUNT_SID or not settings.TWILIO_AUTH_TOKEN:
            logger.warning("Twilio yapılandırması eksik. SMS/WhatsApp devre dışı.")
            return False

        try:
            self.client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
            logger.info("Twilio client başlatıldı.")
            return True
        except Exception as exc:
            logger.error("Twilio başlatma hatası: %s", exc)
            return False

    async def send_sms(self, to_number: str, message: str) -> bool:
        """
        Tek bir telefon numarasına SMS gönderir.

        Args:
            to_number: Alıcı telefon numarası (E.164 format: +905551234567)
            message: Gönderilecek mesaj

        Returns:
            True → başarılı, False → hata
        """
        if not self.client:
            logger.warning("Twilio client başlatılmamış, SMS gönderilemedi.")
            return False

        try:
            msg = self.client.messages.create(
                body=message,
                from_=self.from_number,
                to=to_number
            )
            logger.info("SMS gönderildi: %s → SID: %s", to_number, msg.sid)
            return True
        except TwilioRestException as exc:
            logger.error("Twilio SMS hatası: %s → %s", to_number, exc)
            return False
        except Exception as exc:
            logger.error("SMS gönderme hatası: %s → %s", to_number, exc)
            return False

    async def send_whatsapp(self, to_number: str, message: str) -> bool:
        """
        Tek bir telefon numarasına WhatsApp mesajı gönderir.

        Args:
            to_number: Alıcı telefon numarası (E.164 format: +905551234567)
            message: Gönderilecek mesaj

        Returns:
            True → başarılı, False → hata
        """
        if not self.client:
            logger.warning("Twilio client başlatılmamış, WhatsApp gönderilemedi.")
            return False

        try:
            # WhatsApp için "whatsapp:" prefix ekle
            whatsapp_to = f"whatsapp:{to_number}"
            whatsapp_from = f"whatsapp:{self.from_number}"

            msg = self.client.messages.create(
                body=message,
                from_=whatsapp_from,
                to=whatsapp_to
            )
            logger.info("WhatsApp gönderildi: %s → SID: %s", to_number, msg.sid)
            return True
        except TwilioRestException as exc:
            logger.error("Twilio WhatsApp hatası: %s → %s", to_number, exc)
            return False
        except Exception as exc:
            logger.error("WhatsApp gönderme hatası: %s → %s", to_number, exc)
            return False

    async def send_emergency_alert(
        self,
        phone_numbers: List[str],
        message: str,
        use_whatsapp: bool = False
    ) -> int:
        """
        Birden fazla numaraya acil durum mesajı gönderir.

        Args:
            phone_numbers: Alıcı telefon numaraları listesi
            message: Gönderilecek mesaj
            use_whatsapp: True ise WhatsApp, False ise SMS kullanır

        Returns:
            Başarıyla gönderilen mesaj sayısı
        """
        if not phone_numbers:
            return 0

        success_count = 0
        for phone in phone_numbers:
            if use_whatsapp:
                success = await self.send_whatsapp(phone, message)
            else:
                success = await self.send_sms(phone, message)

            if success:
                success_count += 1

        logger.info(
            "Acil durum mesajı: %d/%d başarılı (%s)",
            success_count,
            len(phone_numbers),
            "WhatsApp" if use_whatsapp else "SMS"
        )
        return success_count


# Singleton instance
_twilio_service: Optional[TwilioService] = None


def get_twilio_service() -> TwilioService:
    """Twilio service singleton döndürür."""
    global _twilio_service
    if _twilio_service is None:
        _twilio_service = TwilioService()
    return _twilio_service
