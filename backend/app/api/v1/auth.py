"""
Şifre sıfırlama ve kimlik doğrulama ek endpoint'leri.
Şifremi unuttum akışı: e-posta gönder → token doğrula → şifre güncelle.
"""

import logging
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.services.auth import hash_password
from app.core.redis import get_redis

logger = logging.getLogger(__name__)
router = APIRouter()

# Şifre sıfırlama token süresi (dakika)
_RESET_TOKEN_EXPIRE_MINUTES = 30
_RESET_TOKEN_PREFIX = "pwd_reset:"


class ForgotPasswordIn(BaseModel):
    """Şifremi unuttum isteği."""
    email: EmailStr


class ResetPasswordIn(BaseModel):
    """Şifre sıfırlama isteği."""
    token: str = Field(min_length=32, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


class ForgotPasswordOut(BaseModel):
    """Şifremi unuttum yanıtı."""
    message: str
    # Geliştirme ortamında token döner, production'da sadece mesaj
    debug_token: str | None = None


@router.post(
    "/forgot-password",
    response_model=ForgotPasswordOut,
    status_code=status.HTTP_200_OK,
    summary="Şifre sıfırlama e-postası gönder",
)
async def forgot_password(
    body: ForgotPasswordIn,
    db: AsyncSession = Depends(get_db),
    redis=Depends(get_redis),
) -> ForgotPasswordOut:
    """
    Kullanıcı e-postasına şifre sıfırlama bağlantısı gönderir.
    Güvenlik: Kullanıcı bulunamasa bile aynı mesajı döner (enumeration önleme).
    """
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    # Güvenlik: kullanıcı yoksa da başarılı mesaj dön
    if not user or not user.is_active:
        logger.info("Şifre sıfırlama isteği (kullanıcı yok): %s", body.email)
        return ForgotPasswordOut(
            message="Eğer bu e-posta kayıtlıysa, sıfırlama bağlantısı gönderildi."
        )

    # Güvenli token üret
    token = secrets.token_urlsafe(48)
    redis_key = f"{_RESET_TOKEN_PREFIX}{token}"

    # Redis'e kaydet (TTL ile)
    await redis.set(
        redis_key,
        str(user.id),
        ex=_RESET_TOKEN_EXPIRE_MINUTES * 60,
    )

    logger.info("Şifre sıfırlama token'ı oluşturuldu: user_id=%d", user.id)

    # TODO: Gerçek e-posta gönderimi (SendGrid/SMTP entegrasyonu)
    # Şimdilik token'ı response'a ekle (geliştirme ortamı)
    # Production'da bu kaldırılmalı ve e-posta gönderilmeli
    reset_link = f"https://depremapp.com/reset-password?token={token}"
    logger.info("Sıfırlama linki (DEV): %s", reset_link)

    return ForgotPasswordOut(
        message="Eğer bu e-posta kayıtlıysa, sıfırlama bağlantısı gönderildi.",
        debug_token=token,  # Geliştirme için — production'da kaldır
    )


@router.post(
    "/reset-password",
    status_code=status.HTTP_200_OK,
    summary="Şifreyi sıfırla",
)
async def reset_password(
    body: ResetPasswordIn,
    db: AsyncSession = Depends(get_db),
    redis=Depends(get_redis),
) -> dict:
    """
    Token ile şifreyi sıfırlar. Token tek kullanımlıktır.
    """
    redis_key = f"{_RESET_TOKEN_PREFIX}{body.token}"

    # Token'ı Redis'ten al
    user_id_str = await redis.get(redis_key)
    if not user_id_str:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Geçersiz veya süresi dolmuş sıfırlama bağlantısı.",
        )

    # Kullanıcıyı bul
    user = await db.get(User, int(user_id_str))
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Kullanıcı bulunamadı.",
        )

    # Şifreyi güncelle
    user.password_hash = hash_password(body.new_password)
    await db.commit()

    # Token'ı sil (tek kullanım)
    await redis.delete(redis_key)

    logger.info("Şifre sıfırlandı: user_id=%d", user.id)
    return {"message": "Şifreniz başarıyla güncellendi. Giriş yapabilirsiniz."}


@router.get(
    "/verify-reset-token/{token}",
    status_code=status.HTTP_200_OK,
    summary="Sıfırlama token'ını doğrula",
)
async def verify_reset_token(
    token: str,
    redis=Depends(get_redis),
) -> dict:
    """
    Token'ın geçerli olup olmadığını kontrol eder.
    Frontend'in token geçerliliğini önceden kontrol etmesi için.
    """
    redis_key = f"{_RESET_TOKEN_PREFIX}{token}"
    user_id_str = await redis.get(redis_key)

    if not user_id_str:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Geçersiz veya süresi dolmuş sıfırlama bağlantısı.",
        )

    # Kalan süreyi hesapla
    ttl = await redis.ttl(redis_key)
    return {
        "valid": True,
        "expires_in_minutes": max(0, ttl // 60),
    }