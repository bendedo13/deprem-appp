"""
Bildirim tercihleri ve FCM token yönetimi endpoint'leri.
JWT ile korumalı — sadece kimliği doğrulanmış kullanıcılar erişebilir.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.api.v1.users import get_current_user
from app.services.fcm import send_earthquake_push

logger = logging.getLogger(__name__)
router = APIRouter()


class FCMTokenIn(BaseModel):
    """FCM token kayıt/güncelleme isteği."""
    fcm_token: str = Field(min_length=10, max_length=512)


class NotificationTestIn(BaseModel):
    """Test bildirimi isteği."""
    magnitude: float = Field(default=5.0, ge=0.1, le=10.0)
    location: str = Field(default="Test Konumu, Türkiye")


@router.post(
    "/fcm-token",
    summary="FCM token kaydet veya güncelle",
    status_code=status.HTTP_200_OK,
)
async def register_fcm_token(
    body: FCMTokenIn,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Kullanıcının FCM cihaz token'ını kaydeder.
    Her cihaz girişinde veya token yenilendiğinde çağrılmalı.
    """
    current_user.fcm_token = body.fcm_token
    await db.commit()
    logger.info("FCM token güncellendi: user_id=%d", current_user.id)
    return {"ok": True, "message": "FCM token kaydedildi."}


@router.delete(
    "/fcm-token",
    summary="FCM token sil (bildirimleri kapat)",
    status_code=status.HTTP_200_OK,
)
async def delete_fcm_token(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    FCM token'ı siler. Kullanıcı artık push bildirimi almaz.
    Çıkış yapıldığında veya bildirimler kapatıldığında çağrılmalı.
    """
    current_user.fcm_token = None
    await db.commit()
    logger.info("FCM token silindi: user_id=%d", current_user.id)
    return {"ok": True, "message": "Bildirimler kapatıldı."}


@router.post(
    "/test",
    summary="Test push bildirimi gönder",
    status_code=status.HTTP_200_OK,
)
async def send_test_notification(
    body: NotificationTestIn,
    current_user: User = Depends(get_current_user),
) -> dict:
    """
    Mevcut kullanıcıya test amaçlı push bildirimi gönderir.
    FCM token kayıtlı değilse 400 döner.
    """
    if not current_user.fcm_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="FCM token kayıtlı değil. Önce /notifications/fcm-token endpoint'ini kullanın.",
        )
    from datetime import datetime, timezone
    sent = await send_earthquake_push(
        fcm_token=current_user.fcm_token,
        magnitude=body.magnitude,
        location=body.location,
        depth=10.0,
        occurred_at=datetime.now(tz=timezone.utc).isoformat(),
    )
    if sent:
        return {"ok": True, "message": "Test bildirimi gönderildi."}
    return {"ok": False, "message": "Bildirim gönderilemedi (Firebase yapılandırması eksik olabilir)."}
