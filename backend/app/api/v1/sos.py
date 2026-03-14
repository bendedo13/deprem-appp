"""
S.O.S Voice Alert API endpoints.
Sesli acil durum bildirimi için endpoint'ler.
"""

import logging
import os
import tempfile
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.dependencies import get_current_user
from app.database import get_db
from app.models.user import User
from app.models.sos_record import SOSRecord
from app.models.emergency_contact import EmergencyContact
from app.schemas.sos import (
    SOSAnalyzeResponse, SOSStatusResponse, ExtractedSOSData, SOSRecordOut,
    SOSTestRequest, SOSTestResponse, SOSTestContactResult,
    SOSAudioResponse, SOSSafeResponse,
)
from app.tasks.process_sos import process_sos_audio_task
from app.services.audio_storage import get_audio_storage
from app.services.twilio_fallback import send_waterfall_emergency
from app.services.whisper_service import get_whisper_service, WhisperServiceError
from app.core.redis import get_redis
from app.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()

# Allowed audio formats
ALLOWED_AUDIO_FORMATS = {".mp3", ".wav", ".m4a", ".ogg", ".webm"}


@router.post(
    "/analyze",
    response_model=SOSAnalyzeResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="S.O.S ses kaydını analiz et (async)"
)
async def analyze_sos(
    audio_file: UploadFile = File(..., description="Ses dosyası (MP3, WAV, M4A)"),
    timestamp: str = Form(..., description="ISO 8601 timestamp"),
    latitude: float = Form(..., description="GPS latitude"),
    longitude: float = Form(..., description="GPS longitude"),
    current_user: User = Depends(get_current_user),
    redis = Depends(get_redis)
) -> SOSAnalyzeResponse:
    """
    S.O.S ses kaydını kabul eder ve asenkron işleme kuyruğuna ekler.
    Hemen 202 Accepted döner, işleme Celery task'ında yapılır.
    """
    # Rate limiting check
    rate_key = f"sos_rate:{current_user.id}"
    try:
        count = await redis.incr(rate_key)
        if count == 1:
            await redis.expire(rate_key, 3600)  # 1 hour
        if count > settings.SOS_RATE_LIMIT_PER_HOUR:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"S.O.S limiti aşıldı. Saatte maksimum {settings.SOS_RATE_LIMIT_PER_HOUR} bildirim yapabilirsiniz."
            )
    except Exception as exc:
        logger.warning("Rate limit check hatası: %s", exc)

    # Validate audio file
    if not audio_file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ses dosyası gerekli"
        )

    file_ext = os.path.splitext(audio_file.filename)[1].lower()
    if file_ext not in ALLOWED_AUDIO_FORMATS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Desteklenmeyen ses formatı. İzin verilenler: {', '.join(ALLOWED_AUDIO_FORMATS)}"
        )

    # Save to temporary file
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext) as tmp_file:
            content = await audio_file.read()
            tmp_file.write(content)
            tmp_path = tmp_file.name

        logger.info("S.O.S audio uploaded: user_id=%d, size=%d bytes", current_user.id, len(content))

        # Queue Celery task
        task = process_sos_audio_task.delay(
            audio_path=tmp_path,
            user_id=current_user.id,
            timestamp=timestamp,
            latitude=latitude,
            longitude=longitude
        )

        logger.info("S.O.S task queued: task_id=%s, user_id=%d", task.id, current_user.id)

        return SOSAnalyzeResponse(
            task_id=task.id,
            status="accepted",
            message="S.O.S kaydınız işleniyor..."
        )

    except Exception as exc:
        logger.error("S.O.S upload hatası: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Ses dosyası yüklenirken hata oluştu"
        )


@router.post(
    "/test",
    response_model=SOSTestResponse,
    status_code=status.HTTP_200_OK,
    summary="S.O.S Twilio test — Celery bypass, senkron yanıt",
    description=(
        "Twilio konfigürasyonunu ve numaraları test eder. "
        "Celery kuyruğunu tamamen bypass eder; doğrudan Twilio API'ye gider ve "
        "senkron sonuç döner. Numara yanlışsa veya Twilio hatası olursa 400 döner."
    ),
)
async def test_sos_twilio(
    payload: SOSTestRequest,
    current_user: User = Depends(get_current_user),
) -> SOSTestResponse:
    """
    Twilio S.O.S test endpoint'i.

    - Celery kuyruğunu BYPASS eder — doğrudan senkron Twilio API çağrısı yapar.
    - Waterfall mantığı aktif: WhatsApp başarısız → SMS fallback.
    - Hata veya yanlış numara durumunda anında 400 döner, mobil ekranda görünür.
    - Test sonucu her numara için detaylı olarak yanıtta yer alır.
    """
    import re
    from fastapi import HTTPException

    # E.164 format doğrulama — +COUNTRYCODE... (7–15 rakam)
    e164_pattern = re.compile(r"^\+[1-9]\d{6,14}$")
    invalid_numbers = [p for p in payload.phone_numbers if not e164_pattern.match(p)]
    if invalid_numbers:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Geçersiz telefon numarası formatı (E.164 gerekli, örn: +905551234567): "
                f"{', '.join(invalid_numbers)}"
            ),
        )

    try:
        # Celery bypass — doğrudan senkron Twilio çağrısı
        # run_in_executor ile event loop'u bloke etmeden çalıştır
        import asyncio
        loop = asyncio.get_running_loop()
        result = await loop.run_in_executor(
            None,
            lambda: send_waterfall_emergency(
                phone_numbers=payload.phone_numbers,
                message=payload.message,
                channel=payload.channel,
                user_id=current_user.id,
                event_type="TEST",
            ),
        )
    except Exception as exc:
        logger.error("[SOS Test] Twilio çağrısı başarısız: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Twilio bağlantı hatası: {exc}",
        )

    any_success = result["whatsapp_sent"] > 0 or result["sms_sent"] > 0

    # Tüm numaralar başarısız olduysa 400 döndür
    if not any_success and result["total"] > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Tüm numaralara gönderim başarısız. "
                f"Başarısız: {result['failed']}/{result['total']}. "
                f"Detaylar: {result['details']}"
            ),
        )

    logger.info(
        "[SOS Test] user_id=%d whatsapp=%d sms=%d failed=%d fallback=%s",
        current_user.id,
        result["whatsapp_sent"], result["sms_sent"],
        result["failed"], result["fallback_used"],
    )

    return SOSTestResponse(
        success=any_success,
        whatsapp_sent=result["whatsapp_sent"],
        sms_sent=result["sms_sent"],
        failed=result["failed"],
        total=result["total"],
        fallback_used=result["fallback_used"],
        details=[SOSTestContactResult(**d) for d in result["details"]],
        message=(
            f"Test tamamlandı: {result['whatsapp_sent']} WhatsApp, "
            f"{result['sms_sent']} SMS gönderildi."
            + (" (Fallback: WhatsApp→SMS kullanıldı)" if result["fallback_used"] else "")
        ),
    )


@router.get(
    "/status/{task_id}",
    response_model=SOSStatusResponse,
    summary="S.O.S işleme durumunu kontrol et"
)
async def get_sos_status(
    task_id: str,
    current_user: User = Depends(get_current_user)
) -> SOSStatusResponse:
    """
    Celery task'ının durumunu kontrol eder.
    """
    from celery.result import AsyncResult

    try:
        task_result = AsyncResult(task_id)

        if task_result.state == "PENDING":
            return SOSStatusResponse(status="pending")
        elif task_result.state == "STARTED":
            return SOSStatusResponse(status="processing")
        elif task_result.state == "SUCCESS":
            result = task_result.result
            if "error" in result:
                return SOSStatusResponse(
                    status="failed",
                    error_message=result.get("message", "Unknown error")
                )
            return SOSStatusResponse(
                status="completed",
                extracted_data=ExtractedSOSData(**result)
            )
        elif task_result.state == "FAILURE":
            return SOSStatusResponse(
                status="failed",
                error_message=str(task_result.info)
            )
        else:
            return SOSStatusResponse(status="processing")

    except Exception as exc:
        logger.error("Task status check hatası: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Durum kontrolü başarısız"
        )


@router.get(
    "/{sos_id}",
    response_model=SOSRecordOut,
    summary="S.O.S kaydını getir"
)
async def get_sos_record(
    sos_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> SOSRecordOut:
    """
    S.O.S kaydını database'den getirir.
    Sadece kendi kayıtlarını görebilir (admin hariç).
    """
    try:
        result = await db.execute(
            select(SOSRecord).where(SOSRecord.id == sos_id)
        )
        sos_record = result.scalar_one_or_none()

        if not sos_record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="S.O.S kaydı bulunamadı"
            )

        # Authorization check
        if sos_record.user_id != current_user.id and not current_user.is_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bu kayda erişim yetkiniz yok"
            )

        return SOSRecordOut.model_validate(sos_record)

    except HTTPException:
        raise
    except Exception as exc:
        logger.error("S.O.S record fetch hatası: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Kayıt getirilemedi"
        )


@router.get(
    "/{sos_id}/audio",
    summary="S.O.S ses dosyasını indir"
)
async def get_sos_audio(
    sos_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    S.O.S ses dosyasını stream eder.
    Sadece kendi kayıtlarını dinleyebilir (admin hariç).
    """
    try:
        result = await db.execute(
            select(SOSRecord).where(SOSRecord.id == sos_id)
        )
        sos_record = result.scalar_one_or_none()

        if not sos_record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="S.O.S kaydı bulunamadı"
            )

        # Authorization check
        if sos_record.user_id != current_user.id and not current_user.is_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bu kayda erişim yetkiniz yok"
            )

        # Get audio file path
        storage = get_audio_storage()
        audio_path = storage.get_audio_path(sos_record.audio_filename, sos_record.created_at)

        if not audio_path or not audio_path.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Ses dosyası bulunamadı"
            )

        logger.info("Audio access: sos_id=%s, user_id=%d", sos_id, current_user.id)

        return FileResponse(
            path=str(audio_path),
            media_type="audio/mpeg",
            filename=sos_record.audio_filename
        )

    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Audio fetch hatası: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Ses dosyası getirilemedi"
        )


# ══════════════════════════════════════════════════════════════════════════════
# POST /audio — Senkron Ses Kaydı → Groq Whisper → Twilio Şelale
# ══════════════════════════════════════════════════════════════════════════════

@router.post(
    "/audio",
    response_model=SOSAudioResponse,
    status_code=status.HTTP_200_OK,
    summary="S.O.S ses kaydını Groq ile metne çevirip Twilio Şelale ile gönder (senkron)",
    description=(
        "Ses dosyasını alır, Groq Whisper ile Türkçe metne çevirir, "
        "acil kişilere WhatsApp→SMS şelale ile gönderir. "
        "Celery kullanmaz — anında sonuç döner."
    ),
)
async def sos_audio_sync(
    audio_file: UploadFile = File(..., description="Ses dosyası (.m4a/.wav/.mp3)"),
    latitude: float = Form(..., description="GPS latitude"),
    longitude: float = Form(..., description="GPS longitude"),
    timestamp: str = Form(default="", description="ISO 8601 timestamp (opsiyonel)"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SOSAudioResponse:
    """
    Ses → Groq Whisper → Twilio Şelale pipeline.

    Zincir:
      1. Ses dosyasını geçici diske kaydet
      2. Groq Whisper ile metne çevir
      3. Acil kişilerin telefon numaralarını DB'den al
      4. Twilio Waterfall: WhatsApp → başarısız olursa SMS
      5. Sonucu senkron döndür

    Fallback:
      - Groq API hatası → "S.O.S Sinyali alındı ancak ses çözümlenemedi."
      - Acil kişi yok → 200 + boş gönderim
    """
    import asyncio

    if not audio_file.filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ses dosyası gerekli")

    file_ext = os.path.splitext(audio_file.filename or "sos.m4a")[1].lower() or ".m4a"
    if file_ext not in ALLOWED_AUDIO_FORMATS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Desteklenmeyen format. İzin verilenler: {', '.join(ALLOWED_AUDIO_FORMATS)}",
        )

    ts = timestamp or datetime.utcnow().isoformat()
    tmp_path: Optional[str] = None
    transcription: str = ""

    try:
        # 1. Geçici dosyaya kaydet
        content = await audio_file.read()
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext) as tmp:
            tmp.write(content)
            tmp_path = tmp.name

        logger.info(
            "[SOS Audio] Dosya alındı: user=%d, boyut=%d bytes, format=%s",
            current_user.id, len(content), file_ext,
        )

        # 2. Groq Whisper transkripsiyon (thread pool — blocking I/O)
        try:
            whisper = get_whisper_service()
            transcription = await asyncio.get_running_loop().run_in_executor(
                None,
                lambda: whisper.transcribe(tmp_path, timeout=12),
            )
            logger.info("[SOS Audio] Groq transkripsiyon OK: %d karakter", len(transcription))
        except (WhisperServiceError, Exception) as exc:
            # KRİTİK FALLBACK — Groq başarısız → sabit metin
            transcription = "S.O.S Sinyali alındı ancak ses çözümlenemedi."
            logger.warning("[SOS Audio] Groq fallback devreye girdi: %s", exc)

        # 3. Acil kişileri al
        contacts_result = await db.execute(
            select(EmergencyContact).where(
                EmergencyContact.user_id == current_user.id,
                EmergencyContact.is_active == True,
            )
        )
        contacts = contacts_result.scalars().all()
        phone_numbers = [c.phone_number for c in contacts if c.phone_number]

        if not phone_numbers:
            logger.warning("[SOS Audio] Acil kişi yok: user_id=%d", current_user.id)
            return SOSAudioResponse(
                success=True,
                transcription=transcription,
                notified_contacts=0,
                whatsapp_sent=0,
                sms_sent=0,
                fallback_used=False,
                message="Transkripsiyon tamamlandı ancak acil kişi bulunamadı. Lütfen acil kişi ekleyin.",
            )

        # 4. Mesaj formatla
        maps_link = f"https://maps.google.com/?q={latitude:.6f},{longitude:.6f}"
        full_message = (
            f"🆘 ACİL DURUM S.O.S: {current_user.email}\n"
            f"Mesaj: {transcription}\n"
            f"📍 Konum: {maps_link}"
        )

        # 5. Twilio Şelale: WhatsApp → SMS
        loop = asyncio.get_running_loop()
        wf_result = await loop.run_in_executor(
            None,
            lambda: send_waterfall_emergency(
                phone_numbers=phone_numbers,
                message=full_message,
                channel="waterfall",
                user_id=current_user.id,
                event_type="SOS_AUDIO",
            ),
        )

        logger.info(
            "[SOS Audio] Twilio Şelale tamamlandı: user=%d, WA=%d, SMS=%d, failed=%d",
            current_user.id,
            wf_result["whatsapp_sent"],
            wf_result["sms_sent"],
            wf_result["failed"],
        )

        return SOSAudioResponse(
            success=True,
            transcription=transcription,
            notified_contacts=wf_result["whatsapp_sent"] + wf_result["sms_sent"],
            whatsapp_sent=wf_result["whatsapp_sent"],
            sms_sent=wf_result["sms_sent"],
            fallback_used=wf_result["fallback_used"],
            message=f"S.O.S iletildi: {wf_result['whatsapp_sent']} WhatsApp, {wf_result['sms_sent']} SMS.",
        )

    except HTTPException:
        raise
    except Exception as exc:
        logger.error("[SOS Audio] Kritik hata: user=%d, %s", current_user.id, exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"S.O.S işlenirken hata oluştu: {exc}",
        )
    finally:
        # Geçici dosyayı temizle
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.unlink(tmp_path)
            except Exception:
                pass


# ══════════════════════════════════════════════════════════════════════════════
# POST /safe — "Ben İyiyim" bildirimi (ses yok, Twilio şelale)
# ══════════════════════════════════════════════════════════════════════════════

@router.post(
    "/safe",
    response_model=SOSSafeResponse,
    status_code=status.HTTP_200_OK,
    summary="Ben İyiyim — acil kişilere güvenlik bildirimi gönder",
)
async def i_am_safe_sos(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SOSSafeResponse:
    """
    Kullanıcı güvende olduğunu acil kişilerine bildirir.

    - Ses kaydı alınmaz, GPS istenmez.
    - Twilio Şelale (WhatsApp → SMS) ile sabit mesaj gönderilir.
    - Mesaj: "Kullanıcı güvende olduğunu bildirdi. Merak etmeyin."
    """
    import asyncio

    # Acil kişileri al
    try:
        contacts_result = await db.execute(
            select(EmergencyContact).where(
                EmergencyContact.user_id == current_user.id,
                EmergencyContact.is_active == True,
            )
        )
        contacts = contacts_result.scalars().all()
        phone_numbers = [c.phone_number for c in contacts if c.phone_number]

        if not phone_numbers:
            return SOSSafeResponse(
                success=True,
                notified_contacts=0,
                whatsapp_sent=0,
                sms_sent=0,
                message="Acil kişi bulunamadı. Lütfen acil kişi listesine numara ekleyin.",
            )

        safe_message = (
            f"✅ İYİYİM BİLDİRİMİ: {current_user.email}\n"
            f"Kullanıcı güvende olduğunu bildirdi. Merak etmeyin. ❤️"
        )

        loop = asyncio.get_running_loop()
        wf_result = await loop.run_in_executor(
            None,
            lambda: send_waterfall_emergency(
                phone_numbers=phone_numbers,
                message=safe_message,
                channel="waterfall",
                user_id=current_user.id,
                event_type="I_AM_SAFE",
            ),
        )

        logger.info(
            "[SOS Safe] Ben İyiyim gönderildi: user=%d, WA=%d, SMS=%d",
            current_user.id,
            wf_result["whatsapp_sent"],
            wf_result["sms_sent"],
        )

        return SOSSafeResponse(
            success=True,
            notified_contacts=wf_result["whatsapp_sent"] + wf_result["sms_sent"],
            whatsapp_sent=wf_result["whatsapp_sent"],
            sms_sent=wf_result["sms_sent"],
            message=f"Bildirim gönderildi: {wf_result['whatsapp_sent']} WhatsApp, {wf_result['sms_sent']} SMS.",
        )

    except Exception as exc:
        logger.error("[SOS Safe] Hata: user=%d, %s", current_user.id, exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Bildirim gönderilirken hata: {exc}",
        )
