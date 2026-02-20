"""
Kullanıcı kayıt, giriş, profil, acil iletişim ve bildirim tercihi endpoint'leri.
rules.md: type hints, Pydantic validation, async, logging, JWT auth, max 50 satır/fonksiyon.
"""

import logging
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.models.emergency_contact import EmergencyContact
from app.models.notification_pref import NotificationPref
from app.schemas.user import UserRegisterIn, UserLoginIn, UserUpdateIn, UserOut, TokenOut
from app.schemas.emergency_contact import EmergencyContactIn, EmergencyContactOut
from app.schemas.notification_pref import NotificationPrefIn, NotificationPrefOut
from app.services.auth import hash_password, verify_password, create_access_token, decode_token

logger = logging.getLogger(__name__)
router = APIRouter()
_bearer = HTTPBearer()

# Acil kişi limiti
_MAX_EMERGENCY_CONTACTS = 5


# ─── Auth Dependency ──────────────────────────────────────────────────────────

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
    db: AsyncSession = Depends(get_db),
) -> User:
    """JWT token'ı doğrular, User döndürür. Geçersizse 401 fırlatır."""
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


# ─── Auth Endpoint'leri ───────────────────────────────────────────────────────

@router.post(
    "/register",
    response_model=TokenOut,
    status_code=status.HTTP_201_CREATED,
    summary="Yeni kullanıcı kaydı",
)
async def register(body: UserRegisterIn, db: AsyncSession = Depends(get_db)) -> TokenOut:
    """E-posta ve şifre ile kullanıcı oluşturur. Aynı e-posta varsa 409 döner."""
    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Bu e-posta adresi zaten kayıtlı.")

    user = User(email=body.email, password_hash=hash_password(body.password))
    db.add(user)
    await db.commit()
    await db.refresh(user)

    token = create_access_token(user.id, user.email)
    logger.info("Yeni kullanıcı kaydedildi: id=%d email=%s", user.id, user.email)
    return TokenOut(access_token=token, user=UserOut.model_validate(user))


@router.post("/login", response_model=TokenOut, summary="Kullanıcı girişi")
async def login(body: UserLoginIn, db: AsyncSession = Depends(get_db)) -> TokenOut:
    """E-posta/şifre doğrular, JWT döner. Hatalı bilgide 401 (güvenlik: hangi alan hatalı belli olmaz)."""
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="E-posta veya şifre hatalı.")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Hesap devre dışı.")

    token = create_access_token(user.id, user.email)
    logger.info("Kullanıcı girişi: id=%d", user.id)
    return TokenOut(access_token=token, user=UserOut.model_validate(user))


# ─── Profil Endpoint'leri ─────────────────────────────────────────────────────

@router.get("/me", response_model=UserOut, summary="Mevcut kullanıcı profili")
async def me(current_user: User = Depends(get_current_user)) -> UserOut:
    """JWT ile kimliği doğrulanmış kullanıcının profilini döner."""
    return UserOut.model_validate(current_user)


@router.patch("/me", response_model=UserOut, summary="Profil güncelle (FCM token, konum)")
async def update_me(
    body: UserUpdateIn,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserOut:
    """FCM token ve/veya konum bilgisini günceller (partial update)."""
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


# ─── Acil İletişim Endpoint'leri ─────────────────────────────────────────────

@router.get(
    "/me/contacts",
    response_model=List[EmergencyContactOut],
    summary="Acil iletişim kişilerini listele",
)
async def list_contacts(current_user: User = Depends(get_current_user)) -> List[EmergencyContactOut]:
    """Kullanıcının tüm acil iletişim kişilerini döner."""
    return [EmergencyContactOut.model_validate(c) for c in current_user.emergency_contacts]


@router.post(
    "/me/contacts",
    response_model=EmergencyContactOut,
    status_code=status.HTTP_201_CREATED,
    summary="Acil iletişim kişisi ekle",
)
async def add_contact(
    body: EmergencyContactIn,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> EmergencyContactOut:
    """Yeni acil iletişim kişisi ekler. Maksimum 5 kişi sınırı uygulanır."""
    if len(current_user.emergency_contacts) >= _MAX_EMERGENCY_CONTACTS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"En fazla {_MAX_EMERGENCY_CONTACTS} acil iletişim kişisi eklenebilir.",
        )

    contact = EmergencyContact(
        user_id=current_user.id,
        name=body.name,
        phone=body.phone,
        email=body.email,
        channel=body.channel,
    )
    db.add(contact)
    await db.commit()
    await db.refresh(contact)
    logger.info("Acil kişi eklendi: user_id=%d contact_id=%d", current_user.id, contact.id)
    return EmergencyContactOut.model_validate(contact)


@router.delete(
    "/me/contacts/{contact_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Acil iletişim kişisini sil",
)
async def delete_contact(
    contact_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    """Belirtilen acil iletişim kişisini siler. Başka kullanıcıya ait kişiyi silmeye 404 döner."""
    result = await db.execute(
        select(EmergencyContact).where(
            EmergencyContact.id == contact_id,
            EmergencyContact.user_id == current_user.id,
        )
    )
    contact = result.scalar_one_or_none()
    if not contact:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Kişi bulunamadı.")

    await db.delete(contact)
    await db.commit()
    logger.info("Acil kişi silindi: user_id=%d contact_id=%d", current_user.id, contact_id)


# ─── Bildirim Tercihi Endpoint'leri ──────────────────────────────────────────

async def _get_or_create_pref(user: User, db: AsyncSession) -> NotificationPref:
    """Kullanıcının bildirim tercihini döner; yoksa varsayılan değerlerle oluşturur."""
    result = await db.execute(
        select(NotificationPref).where(NotificationPref.user_id == user.id)
    )
    pref = result.scalar_one_or_none()
    if not pref:
        pref = NotificationPref(user_id=user.id)
        db.add(pref)
        await db.commit()
        await db.refresh(pref)
    return pref


@router.get(
    "/me/preferences",
    response_model=NotificationPrefOut,
    summary="Bildirim tercihlerini getir",
)
async def get_preferences(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> NotificationPrefOut:
    """Bildirim tercihlerini döner. İlk istekte varsayılan değerlerle oluşturulur."""
    pref = await _get_or_create_pref(current_user, db)
    return NotificationPrefOut.model_validate(pref)


@router.put(
    "/me/preferences",
    response_model=NotificationPrefOut,
    summary="Bildirim tercihlerini güncelle",
)
async def update_preferences(
    body: NotificationPrefIn,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> NotificationPrefOut:
    """min_magnitude, radius_km ve is_enabled değerlerini günceller."""
    pref = await _get_or_create_pref(current_user, db)
    pref.min_magnitude = body.min_magnitude
    pref.radius_km = body.radius_km
    pref.is_enabled = body.is_enabled
    await db.commit()
    await db.refresh(pref)
    logger.info("Bildirim tercihi güncellendi: user_id=%d", current_user.id)
    return NotificationPrefOut.model_validate(pref)


# ─── "Ben İyiyim" Endpoint'i ─────────────────────────────────────────────────

@router.post(
    "/me/safe",
    status_code=status.HTTP_200_OK,
    summary="Ben İyiyim — acil kişilere FCM push gönder",
)
async def i_am_safe(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Kullanıcı deprem sonrası 'Ben İyiyim' butonuna basar.
    Acil iletişim kişilerinin FCM token'ları toplanır ve push bildirim gönderilir.
    """
    from app.services.fcm import send_i_am_safe  # geç import

    contacts = current_user.emergency_contacts
    # FCM token'ı olan acil kişi token'larını topla
    fcm_tokens: List[str] = []
    for contact in contacts:
        # Acil kişinin kullanıcı hesabı varsa token'ını bul (e-posta eşleşmesi)
        result = await db.execute(
            select(User).where(User.email == contact.email, User.fcm_token.is_not(None))
        )
        matched_user = result.scalar_one_or_none()
        if matched_user and matched_user.fcm_token:
            fcm_tokens.append(matched_user.fcm_token)

    notified = await send_i_am_safe(
        sender_email=current_user.email,
        latitude=current_user.latitude,
        longitude=current_user.longitude,
        fcm_tokens=fcm_tokens,
    )

    logger.info(
        "Ben İyiyim: user_id=%d fcm_gönderildi=%d / toplam_acil=%d",
        current_user.id,
        notified,
        len(contacts),
    )
    return {
        "status": "ok",
        "message": "Bildirim gönderildi.",
        "notified_contacts": notified,
        "total_contacts": len(contacts),
    }
