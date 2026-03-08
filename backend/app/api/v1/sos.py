"""
S.O.S Voice Alert API endpoints.
Sesli acil durum bildirimi için endpoint'ler.
"""

import logging
import os
import tempfile
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user
from app.database import get_db
from app.models.user import User
from app.models.sos_record import SOSRecord
from app.schemas.sos import SOSAnalyzeResponse, SOSStatusResponse, ExtractedSOSData, SOSRecordOut
from app.tasks.process_sos import process_sos_audio_task
from app.services.audio_storage import get_audio_storage
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
