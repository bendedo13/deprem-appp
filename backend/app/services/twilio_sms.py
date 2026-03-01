"""
Twilio SMS/WhatsApp servisi.
Acil durum bildirimlerini SMS ve WhatsApp üzerinden gönderir.
"""

import logging
from typing import Optional

from app.config import settings

logger = logging.getLogger(__name__)


class TwilioService:
    """
    Twilio SMS ve WhatsApp mesaj gönderme servisi.
    Credentials eksikse mock modda çalışır (geliştirme ortamı).
    """

    def __init__(self) -> None:
        self.account_sid = settings.TWILIO_ACCOUNT_SID
        self.auth_token = settings.TWILIO_AUTH_TOKEN
        self.phone_number = settings.TWILIO_PHONE_NUMBER
        self.whatsapp_number = settings.TWILIO_WHATSAPP_NUMBER
        self._client = None
        self._initialized = False

        if self.account_sid and self.auth_token:
            try:
                from twilio.rest import Client
                self._client = Client(self.account_sid, self.auth_token)
                self._initialized = True
                logger.info("Twilio servisi başlatıldı: account_sid=%s", self.account_sid[:8] + "***")
            except ImportError:
                logger.warning("Twilio kütüphanesi yüklü değil. 'pip install twilio' çalıştırın.")
            except Exception as exc:
                logger.error("Twilio başlatma hatası: %s", exc)
        else:
            logger.warning(
                "Twilio credentials eksik. SMS/WhatsApp bildirimleri devre dışı. "
                "TWILIO_ACCOUNT_SID ve TWILIO_AUTH_TOKEN ortam değişkenlerini ayarlayın."
            )

    @property
    def is_available(self) -> bool:
        """Twilio servisinin kullanılabilir olup olmadığını döner."""
        return self._initialized and self._client is not None

    async def send_sms(self, to_phone: str, message: str) -> bool:
        """
        SMS gönderir.

        Args:
            to_phone: Alıcı telefon numarası (E.164 formatı: +905551234567)
            message: Mesaj metni (max 160 karakter önerilir)

        Returns:
            True: Başarılı, False: Başarısız
        """
        if not self.is_available:
            logger.warning(
                "Twilio mevcut değil. SMS gönderilemedi. Hedef: %s, Mesaj: %s",
                to_phone[:6] + "***",
                message[:50]
            )
            return False

        # Telefon numarası formatını düzelt
        formatted_phone = self._format_phone(to_phone)
        if not formatted_phone:
            logger.error("Geçersiz telefon numarası: %s", to_phone)
            return False

        try:
            msg = self._client.messages.create(
                body=message,
                from_=self.phone_number,
                to=formatted_phone,
            )
            logger.info(
                "SMS gönderildi: to=%s, sid=%s, status=%s",
                formatted_phone[:6] + "***",
                msg.sid,
                msg.status
            )
            return True
        except Exception as exc:
            logger.error("SMS gönderme hatası (to=%s): %s", formatted_phone[:6] + "***", exc)
            return False

    async def send_whatsapp(self, to_phone: str, message: str) -> bool:
        """
        WhatsApp mesajı gönderir.

        Args:
            to_phone: Alıcı telefon numarası (E.164 formatı)
            message: Mesaj metni

        Returns:
            True: Başarılı, False: Başarısız
        """
        if not self.is_available:
            logger.warning(
                "Twilio mevcut değil. WhatsApp gönderilemedi. Hedef: %s",
                to_phone[:6] + "***"
            )
            return False

        if not self.whatsapp_number:
            logger.warning("TWILIO_WHATSAPP_NUMBER ayarlanmamış.")
            return False

        formatted_phone = self._format_phone(to_phone)
        if not formatted_phone:
            logger.error("Geçersiz telefon numarası: %s", to_phone)
            return False

        try:
            msg = self._client.messages.create(
                body=message,
                from_=f"whatsapp:{self.whatsapp_number}",
                to=f"whatsapp:{formatted_phone}",
            )
            logger.info(
                "WhatsApp gönderildi: to=%s, sid=%s",
                formatted_phone[:6] + "***",
                msg.sid
            )
            return True
        except Exception as exc:
            logger.error("WhatsApp gönderme hatası: %s", exc)
            return False

    async def send_emergency_alert(
        self,
        to_phone: str,
        user_name: str,
        latitude: Optional[float],
        longitude: Optional[float],
        custom_message: Optional[str] = None,
        use_whatsapp: bool = False,
    ) -> bool:
        """
        Acil durum uyarısı gönderir (SMS veya WhatsApp).

        Args:
            to_phone: Alıcı telefon numarası
            user_name: Kullanıcı adı
            latitude: GPS enlem
            longitude: GPS boylam
            custom_message: Özel mesaj
            use_whatsapp: WhatsApp kullan (True) veya SMS (False)

        Returns:
            True: Başarılı, False: Başarısız
        """
        # Mesaj oluştur
        base_msg = custom_message or "Ben iyiyim!"
        message = f"🚨 QuakeSense Acil Bildirim\n{user_name}: {base_msg}"

        if latitude and longitude:
            maps_url = f"https://maps.google.com/?q={latitude},{longitude}"
            message += f"\n📍 Konum: {maps_url}"

        message += "\n\nBu mesaj QuakeSense uygulaması tarafından gönderilmiştir."

        if use_whatsapp:
            return await self.send_whatsapp(to_phone, message)
        return await self.send_sms(to_phone, message)

    async def send_sos_alert(
        self,
        to_phone: str,
        user_name: str,
        durum: str,
        aciliyet: str,
        lokasyon: str,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
    ) -> bool:
        """
        S.O.S acil durum uyarısı gönderir.

        Args:
            to_phone: Alıcı telefon numarası
            user_name: Kullanıcı adı
            durum: Durum bilgisi (Enkaz Altında, Güvende, Bilinmiyor)
            aciliyet: Aciliyet seviyesi (Kırmızı, Sarı, Yeşil)
            lokasyon: Konum açıklaması
            latitude: GPS enlem
            longitude: GPS boylam

        Returns:
            True: Başarılı, False: Başarısız
        """
        # Aciliyet emojisi
        emoji_map = {"Kırmızı": "🔴", "Sarı": "🟡", "Yeşil": "🟢"}
        emoji = emoji_map.get(aciliyet, "⚠️")

        message = (
            f"{emoji} QuakeSense S.O.S UYARISI\n"
            f"Kişi: {user_name}\n"
            f"Durum: {durum}\n"
            f"Aciliyet: {aciliyet}\n"
            f"Konum: {lokasyon}"
        )

        if latitude and longitude:
            maps_url = f"https://maps.google.com/?q={latitude},{longitude}"
            message += f"\n📍 GPS: {maps_url}"

        message += "\n\nLütfen derhal iletişime geçin!"

        return await self.send_sms(to_phone, message)

    @staticmethod
    def _format_phone(phone: str) -> Optional[str]:
        """
        Telefon numarasını E.164 formatına dönüştürür.

        Args:
            phone: Ham telefon numarası

        Returns:
            E.164 formatında numara veya None (geçersizse)
        """
        # Boşluk ve tire temizle
        cleaned = phone.strip().replace(" ", "").replace("-", "").replace("(", "").replace(")", "")

        if not cleaned:
            return None

        # Zaten + ile başlıyorsa doğrudan kullan
        if cleaned.startswith("+"):
            if len(cleaned) >= 10:
                return cleaned
            return None

        # Türkiye numarası: 05xx → +905xx
        if cleaned.startswith("05") and len(cleaned) == 11:
            return "+9" + cleaned

        # 5xx ile başlıyorsa +905xx
        if cleaned.startswith("5") and len(cleaned) == 10:
            return "+90" + cleaned

        # 90 ile başlıyorsa +90 ekle
        if cleaned.startswith("90") and len(cleaned) == 12:
            return "+" + cleaned

        # Genel: + ekle
        if cleaned.isdigit() and len(cleaned) >= 10:
            return "+" + cleaned

        return None


# Singleton instance
_twilio_service: Optional[TwilioService] = None


def get_twilio_service() -> TwilioService:
    """Twilio servis singleton döndürür."""
    global _twilio_service
    if _twilio_service is None:
        _twilio_service = TwilioService()
    return _twilio_service