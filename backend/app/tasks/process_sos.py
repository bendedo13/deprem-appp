"""
S.O.S ses kaydı işleme Celery task'ı.
Asenkron olarak Groq Whisper + LLM + DB + Notification pipeline'ını çalıştırır.
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
    2. Groq Whisper ile transcribe et
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
            logger.info("Groq Whisper transkripsiyon başarılı: %d karakter", len(transcription))
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
            EmergencyContact.user_id == user_id,
            EmergencyContact.is_active == True,
        ).all()

        if not contacts:
            logger.warning("Emergency contacts bulunamadı: user_id=%d", user_id)
            return

        # Şablon context'i ve mesaj — Celery task ile kuyruğa at
        from app.services.sos_service import render_template_sync
        from app.tasks.send_emergency_twilio import send_emergency_alerts

        phone_numbers = [c.phone_number for c in contacts if c.phone_number]

        if phone_numbers:
            context = {
                "durum": extracted_data["durum"],
                "kisi_sayisi": extracted_data["kisi_sayisi"],
                "aciliyet": extracted_data["aciliyet"],
                "lokasyon": extracted_data["lokasyon"],
                "orijinal_metin": sos_record.orijinal_metin or "",
                "audio_url": audio_url,
                "user_email": user.email,
            }
            default_template = (
                "🚨 S.O.S Bildirimi\n"
                "Durum: {durum}\n"
                "Kişi Sayısı: {kisi_sayisi}\n"
                "Aciliyet: {aciliyet}\n"
                "Konum: {lokasyon}\n"
                "Ses mesajı metni: {orijinal_metin}\n"
                "Ses Kaydı: {audio_url}\n"
                "Gönderen: {user_email}"
            )
            message = render_template_sync(db, "sos_voice_template", default_template, context)

            send_emergency_alerts.apply_async(
                args=[phone_numbers, message],
                kwargs={"channel": "hybrid"},
                queue="default",
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
            EmergencyContact.user_id == user_id,
            EmergencyContact.is_active == True,
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

        # Send via Celery task (SMS + WhatsApp hybrid)
        phone_numbers = [c.phone_number for c in contacts if c.phone_number]
        if phone_numbers:
            from app.tasks.send_emergency_twilio import send_emergency_alerts
            send_emergency_alerts.apply_async(
                args=[phone_numbers, message],
                kwargs={"channel": "hybrid"},
                queue="default",
            )

        logger.info("Fallback alert gönderildi: user_id=%d", user_id)

    except Exception as exc:
        logger.error("Fallback alert hatası: %s", exc)
    finally:
        db.close()
