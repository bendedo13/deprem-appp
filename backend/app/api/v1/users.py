"""
Kullanıcı kayıt, giriş, profil endpoint'leri.
rules.md: type hints, Pydantic validation, async, logging, JWT auth.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.schemas.user import UserRegisterIn, UserLoginIn, UserUpdateIn, UserOut, TokenOut
from app.services.auth import hash_password, verify_password, create_access_token, decode_token

logger = logging.getLogger(__name__)
router = APIRouter()
_bearer = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    FastAPI dependency — JWT token'ı doğrular, User döndürür.
    Token geçersiz veya kullanıcı yoksa 401 fırlatır.
    """
    payload = decode_token(credentials.credentials)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Geçersiz veya süresi dolmuş token.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user = await db.get(User, int(payload["sub"]))
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Kullanıcı bulunamadı veya devre dışı.",
        )
    return user


@router.post(
    "/register",
    response_model=TokenOut,
    status_code=status.HTTP_201_CREATED,
    summary="Yeni kullanıcı kaydı",
)
async def register(
    body: UserRegisterIn,
    db: AsyncSession = Depends(get_db),
) -> TokenOut:
    """
    E-posta ve şifre ile kullanıcı oluşturur.
    Aynı e-posta zaten kayıtlıysa 409 döner.
    """
    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Bu e-posta adresi zaten kayıtlı.",
        )

    user = User(
        email=body.email,
        password_hash=hash_password(body.password),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    token = create_access_token(user.id, user.email)
    logger.info("Yeni kullanıcı kaydedildi: id=%d email=%s", user.id, user.email)
    return TokenOut(access_token=token, user=UserOut.model_validate(user))


@router.post(
    "/login",
    response_model=TokenOut,
    summary="Kullanıcı girişi",
)
async def login(
    body: UserLoginIn,
    db: AsyncSession = Depends(get_db),
) -> TokenOut:
    """
    E-posta ve şifre doğrular, JWT döner.
    Hatalı bilgide 401 döner (hangi alanın hatalı olduğunu söylemez — güvenlik).
    """
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="E-posta veya şifre hatalı.",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Hesap devre dışı.",
        )

    token = create_access_token(user.id, user.email)
    logger.info("Kullanıcı girişi: id=%d", user.id)
    return TokenOut(access_token=token, user=UserOut.model_validate(user))


@router.get(
    "/me",
    response_model=UserOut,
    summary="Mevcut kullanıcı profili",
)
async def me(current_user: User = Depends(get_current_user)) -> UserOut:
    """JWT token ile kimliği doğrulanmış kullanıcının profilini döner."""
    return UserOut.model_validate(current_user)


@router.patch(
    "/me",
    response_model=UserOut,
    summary="Profil güncelle (FCM token, konum)",
)
async def update_me(
    body: UserUpdateIn,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserOut:
    """
    FCM token ve/veya konum bilgisini günceller.
    Sadece body'de gelen alanlar güncellenir (partial update).
    """
    if body.fcm_token is not None:
        current_user.fcm_token = body.fcm_token
    if body.latitude is not None:
        current_user.latitude = body.latitude
    if body.longitude is not None:
        current_user.longitude = body.longitude

    await db.commit()
    await db.refresh(current_user)
    logger.info("Kullanıcı profili güncellendi: id=%d", current_user.id)
    return UserOut.model_validate(current_user)
