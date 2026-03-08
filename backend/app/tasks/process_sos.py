"""
S.O.S ses kaydı işleme Celery task'ı.
Asenkron olarak Whisper + LLM + DB + Notification pipeline'ını çalıştırır.
"""

import logging
from typing import Dict, Any

from celery import Task
from sqlalchemy import select

from app.tasks.celery_app import celery_app
from app.database import SyncSessionLocal
from app.models.sos_record import SOSRecord
from app.models.user import User
from app.models.emergency_contact import EmergencyContact
from app.services.whisper_service import get_whisper_service, WhisperServiceError
from app.services.llm_extractor import get_llm_extractor, LLMExtractorError
from app.services.audio_storage import get_audio_storage, AudioStorageError
from app.services.twilio_sms import get_twilio_service
from app.services.fcm import send_i_am_safe

logger = logging.getLogger(__name__)


@celery_app.task(bind=True, max_retries=0)
def process_sos_audio_task(
    self: Task,
    audio_path: str,
    user_id: int,
    timestamp: str,
    latitude: float,
    longitude: float
) -> Dict[str, Any]:
    """
    S.O.S ses kaydını işler:
    1. Ses dosyasını storage'a kaydet
    2. Whisper ile transcribe et
    3. LLM ile structured data çıkar
    4. Database'e kaydet
    5. Emergency contacts'a bildirim gönder

    Args:
        audio_path: Geçici ses dosyası yolu
        user_id: Kullanıcı ID
        timestamp: ISO 8601 timestamp
        latitude: GPS latitude
        longitude: GPS longitude

    Returns:
        Extracted S.O.S data dictionary
    """
    logger.info("S.O.S processing başladı: user_id=%d", user_id)

    # Services
    whisper = get_whisper_service()
    llm = get_llm_extractor()
    storage = get_audio_storage()
    twilio = get_twilio_service()

    audio_url = ""
    audio_filename = ""
    transcription = ""
    extracted_data = {}

    try:
        # 1. Save audio file
        try:
            audio_url, audio_filename = storage.save_audio(audio_path, user_id, timestamp)
            logger.info("Audio saved: %s", audio_filename)
        except AudioStorageError as exc:
            logger.error("Audio storage hatası: %s", exc)
            return _handle_critical_failure(
                user_id, latitude, longitude, timestamp, str(exc)
            )

        # 2. Transcribe with Whisper
        try:
            import asyncio
            transcription = asyncio.run(whisper.transcribe(audio_path, timeout=10))
            logger.info("Whisper transcription başarılı: %d karakter", len(transcription))
        except WhisperServiceError as exc:
            logger.warning("Whisper hatası, fallback kullanılıyor: %s", exc)
            return _handle_whisper_failure(
                audio_url, audio_filename, user_id, latitude, longitude, timestamp
            )

        # 3. Extract structured data with LLM
        try:
            import asyncio
            extracted_data = asyncio.run(llm.extract_sos_data(transcription, timeout=15))
            logger.info("LLM extraction başarılı: %s", extracted_data)
        except LLMExtractorError as exc:
            logger.warning("LLM hatası, fallback kullanılıyor: %s", exc)
            return _handle_llm_failure(
                transcription, audio_url, audio_filename, user_id, latitude, longitude, timestamp
            )

        # Use GPS if no location mentioned
        if not extracted_data.get("lokasyon"):
            extracted_data["lokasyon"] = f"GPS: {latitude:.4f}, {longitude:.4f}"

        # 4. Save to database
        sos_record = _create_sos_record(
            user_id=user_id,
            durum=extracted_data["durum"],
            kisi_sayisi=extracted_data["kisi_sayisi"],
            aciliyet=extracted_data["aciliyet"],
            lokasyon=extracted_data["lokasyon"],
            orijinal_metin=transcription,
            audio_url=audio_url,
            audio_filename=audio_filename,
            latitude=latitude,
            longitude=longitude,
            processing_status="completed"
        )

        # 5. Send emergency alerts
        _send_emergency_alerts(user_id, sos_record, extracted_data, audio_url)

        logger.info("S.O.S processing tamamlandı: sos_id=%s", sos_record.id)

        return {
            "sos_id": str(sos_record.id),
            "durum": sos_record.durum,
            "kisi_sayisi": sos_record.kisi_sayisi,
            "aciliyet": sos_record.aciliyet,
            "lokasyon": sos_record.lokasyon,
            "orijinal_metin": sos_record.orijinal_metin
        }

    except Exception as exc:
        logger.error("S.O.S processing kritik hatası: %s", exc)
        return _handle_critical_failure(
            user_id, latitude, longitude, timestamp, str(exc), audio_url, audio_filename
        )


def _create_sos_record(
    user_id: int,
    durum: str,
    kisi_sayisi: int,
    aciliyet: str,
    lokasyon: str,
    orijinal_metin: str,
    audio_url: str,
    audio_filename: str,
    latitude: float,
    longitude: float,
    processing_status: str,
    error_message: str = None
) -> SOSRecord:
    """Database'e S.O.S record oluşturur (sync)."""
    db = SyncSessionLocal()
    try:
        sos_record = SOSRecord(
            user_id=user_id,
            durum=durum,
            kisi_sayisi=kisi_sayisi,
            aciliyet=aciliyet,
            lokasyon=lokasyon,
            orijinal_metin=orijinal_metin,
            audio_url=audio_url,
            audio_filename=audio_filename,
            latitude=latitude,
            longitude=longitude,
            processing_status=processing_status,
            error_message=error_message
        )
        db.add(sos_record)
        db.commit()
        db.refresh(sos_record)
        logger.info("S.O.S record created: id=%s", sos_record.id)
        return sos_record
    finally:
        db.close()


def _send_emergency_alerts(
    user_id: int,
    sos_record: SOSRecord,
    extracted_data: Dict[str, Any],
    audio_url: str
):
    """Emergency contacts'a bildirim gönderir (sync)."""
    db = SyncSessionLocal()
    try:
        # Get user and emergency contacts
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            logger.warning("User bulunamadı: user_id=%d", user_id)
            return

        contacts = db.query(EmergencyContact).filter(
            EmergencyContact.user_id == user_id
        ).all()

        if not contacts:
            logger.warning("Emergency contacts bulunamadı: user_id=%d", user_id)
            return

        # Format message
        message = (
            f"🚨 S.O.S Bildirimi\n"
            f"Durum: {extracted_data['durum']}\n"
            f"Kişi Sayısı: {extracted_data['kisi_sayisi']}\n"
            f"Aciliyet: {extracted_data['aciliyet']}\n"
            f"Konum: {extracted_data['lokasyon']}\n"
            f"Ses Kaydı: {audio_url}\n"
            f"Gönderen: {user.email}"
        )

        # Send SMS + Twilio WhatsApp hibrit
        from app.services.sos_service import send_hybrid_via_twilio_sync

        phone_numbers = [c.phone for c in contacts if c.phone]

        if phone_numbers:
            result = send_hybrid_via_twilio_sync(phone_numbers, message, channel="hybrid")
            logger.info(
                "SOS hibrit bildirim: sms=%d, whatsapp=%d, contacts=%d",
                result["sms_sent"],
                result["whatsapp_sent"],
                len(phone_numbers),
            )

        logger.info("Emergency alerts gönderildi: user_id=%d, contacts=%d", user_id, len(contacts))

    except Exception as exc:
        logger.error("Emergency alert gönderme hatası: %s", exc)
    finally:
        db.close()


def _handle_whisper_failure(
    audio_url: str,
    audio_filename: str,
    user_id: int,
    latitude: float,
    longitude: float,
    timestamp: str
) -> Dict[str, Any]:
    """Whisper başarısız olduğunda fallback."""
    logger.warning("Whisper failure fallback: user_id=%d", user_id)

    sos_record = _create_sos_record(
        user_id=user_id,
        durum="Bilinmiyor",
        kisi_sayisi=1,
        aciliyet="Kırmızı",  # Assume worst case
        lokasyon=f"GPS: {latitude:.4f}, {longitude:.4f}",
        orijinal_metin="[Ses metni işlenemedi]",
        audio_url=audio_url,
        audio_filename=audio_filename,
        latitude=latitude,
        longitude=longitude,
        processing_status="completed",
        error_message="Whisper transcription failed"
    )

    # Send fallback alert
    _send_fallback_alert(user_id, audio_url, latitude, longitude)

    return {
        "sos_id": str(sos_record.id),
        "durum": "Bilinmiyor",
        "kisi_sayisi": 1,
        "aciliyet": "Kırmızı",
        "lokasyon": sos_record.lokasyon,
        "orijinal_metin": "[Ses metni işlenemedi]"
    }


def _handle_llm_failure(
    transcription: str,
    audio_url: str,
    audio_filename: str,
    user_id: int,
    latitude: float,
    longitude: float,
    timestamp: str
) -> Dict[str, Any]:
    """LLM başarısız olduğunda fallback."""
    logger.warning("LLM failure fallback: user_id=%d", user_id)

    sos_record = _create_sos_record(
        user_id=user_id,
        durum="Bilinmiyor",
        kisi_sayisi=1,
        aciliyet="Kırmızı",  # Assume worst case
        lokasyon=f"GPS: {latitude:.4f}, {longitude:.4f}",
        orijinal_metin=transcription,
        audio_url=audio_url,
        audio_filename=audio_filename,
        latitude=latitude,
        longitude=longitude,
        processing_status="completed",
        error_message="LLM extraction failed"
    )

    # Send fallback alert with transcription
    _send_fallback_alert(user_id, audio_url, latitude, longitude, transcription)

    return {
        "sos_id": str(sos_record.id),
        "durum": "Bilinmiyor",
        "kisi_sayisi": 1,
        "aciliyet": "Kırmızı",
        "lokasyon": sos_record.lokasyon,
        "orijinal_metin": transcription
    }


def _handle_critical_failure(
    user_id: int,
    latitude: float,
    longitude: float,
    timestamp: str,
    error: str,
    audio_url: str = "",
    audio_filename: str = ""
) -> Dict[str, Any]:
    """Kritik hata durumunda fallback."""
    logger.error("Critical failure fallback: user_id=%d, error=%s", user_id, error)

    if audio_url:
        sos_record = _create_sos_record(
            user_id=user_id,
            durum="Bilinmiyor",
            kisi_sayisi=1,
            aciliyet="Kırmızı",
            lokasyon=f"GPS: {latitude:.4f}, {longitude:.4f}",
            orijinal_metin="[İşleme hatası]",
            audio_url=audio_url,
            audio_filename=audio_filename,
            latitude=latitude,
            longitude=longitude,
            processing_status="failed",
            error_message=error
        )

        _send_fallback_alert(user_id, audio_url, latitude, longitude)

        return {
            "sos_id": str(sos_record.id),
            "durum": "Bilinmiyor",
            "kisi_sayisi": 1,
            "aciliyet": "Kırmızı",
            "lokasyon": sos_record.lokasyon,
            "orijinal_metin": "[İşleme hatası]"
        }

    return {
        "error": "Critical processing failure",
        "message": error
    }


def _send_fallback_alert(
    user_id: int,
    audio_url: str,
    latitude: float,
    longitude: float,
    transcription: str = None
):
    """Fallback durumunda basit alert gönderir."""
    db = SyncSessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return

        contacts = db.query(EmergencyContact).filter(
            EmergencyContact.user_id == user_id
        ).all()

        if not contacts:
            return

        # Format fallback message
        if transcription:
            message = (
                f"🚨 S.O.S Bildirimi (İşlenmemiş)\n"
                f"Mesaj: {transcription}\n"
                f"Konum: GPS {latitude:.4f}, {longitude:.4f}\n"
                f"Ses: {audio_url}\n"
                f"Gönderen: {user.email}"
            )
        else:
            message = (
                f"🚨 S.O.S Bildirimi (İşlenmemiş)\n"
                f"Ses kaydı: {audio_url}\n"
                f"Konum: GPS {latitude:.4f}, {longitude:.4f}\n"
                f"Gönderen: {user.email}"
            )

        # Send SMS
        twilio = get_twilio_service()
        phone_numbers = [c.phone for c in contacts if c.phone and c.channel in ["sms", "whatsapp"]]

        if phone_numbers:
            import asyncio
            asyncio.run(twilio.send_emergency_alert(phone_numbers, message, use_whatsapp=False))

        logger.info("Fallback alert gönderildi: user_id=%d", user_id)

    except Exception as exc:
        logger.error("Fallback alert hatası: %s", exc)
    finally:
        db.close()
