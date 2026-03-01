"""
Kullanıcı kayıt, giriş, profil, acil iletişim ve bildirim tercihi endpoint'leri.
rules.md: type hints, Pydantic validation, async, logging, JWT auth, max 50 satır/fonksiyon.
"""

import logging
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status, Body
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.models.emergency_contact import EmergencyContact
from app.models.notification_pref import NotificationPref
from app.schemas.user import (
    UserRegisterIn, UserLoginIn, UserUpdateIn, UserOut, TokenOut,
    ProfileUpdate, PasswordChange, ImSafeRequest
)
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


@router.put("/me", response_model=UserOut, summary="Profil bilgilerini güncelle")
async def update_profile(
    body: ProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserOut:
    """Ad, telefon, avatar, e-posta gibi profil bilgilerini günceller."""
    if body.name is not None:
        current_user.name = body.name
    if body.phone is not None:
        current_user.phone = body.phone
    if body.avatar is not None:
        current_user.avatar = body.avatar
    if body.email is not None and body.email != current_user.email:
        # E-posta değişiyorsa unique kontrolü
        existing = await db.execute(select(User).where(User.email == body.email))
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=409, detail="Bu e-posta zaten kullanımda.")
        current_user.email = body.email

    await db.commit()
    await db.refresh(current_user)
    logger.info("Profil güncellendi: id=%d", current_user.id)
    return UserOut.model_validate(current_user)


@router.patch("/me", response_model=UserOut, summary="Teknik güncelleme (FCM, Konum)")
async def update_me_technical(
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
    return UserOut.model_validate(current_user)


@router.put("/me/password", status_code=status.HTTP_200_OK, summary="Şifre değiştir")
async def change_password(
    body: PasswordChange,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Kullanıcı şifresini değiştirir."""
    if not verify_password(body.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Mevcut şifre hatalı.")

    current_user.password_hash = hash_password(body.new_password)
    await db.commit()
    logger.info("Şifre değiştirildi: id=%d", current_user.id)
    return {"message": "Şifre başarıyla güncellendi."}


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT, summary="Hesabı sil")
async def delete_account(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    """Kullanıcı hesabını ve ilişkili verileri siler (KVKK)."""
    await db.delete(current_user)
    await db.commit()
    logger.info("Hesap silindi: id=%d", current_user.id)


# ─── Acil İletişim Endpoint'leri ─────────────────────────────────────────────

@router.get(
    "/me/contacts",
    response_model=List[EmergencyContactOut],
    summary="Acil iletişim kişilerini listele",
)
async def list_contacts(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[EmergencyContactOut]:
    """Kullanıcının tüm acil iletişim kişilerini döner."""
    # selectin lazy loading yerine explicit sorgu — N+1 sorununu önler
    result = await db.execute(
        select(EmergencyContact).where(EmergencyContact.user_id == current_user.id)
        .order_by(EmergencyContact.priority.asc(), EmergencyContact.id.asc())
    )
    contacts = result.scalars().all()
    return [EmergencyContactOut.model_validate(c) for c in contacts]


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
    # Mevcut kişi sayısını DB'den sorgula (lazy loading güvenilir değil)
    count_result = await db.execute(
        select(EmergencyContact).where(EmergencyContact.user_id == current_user.id)
    )
    existing_contacts = count_result.scalars().all()

    if len(existing_contacts) >= _MAX_EMERGENCY_CONTACTS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"En fazla {_MAX_EMERGENCY_CONTACTS} acil iletişim kişisi eklenebilir.",
        )

    contact = EmergencyContact(
        user_id=current_user.id,
        name=body.name,
        phone=body.phone,
        email=body.email,
        relation=body.relation,
        methods=body.methods,
        priority=body.priority,
    )
    db.add(contact)
    await db.commit()
    await db.refresh(contact)
    logger.info("Acil kişi eklendi: user_id=%d contact_id=%d", current_user.id, contact.id)
    return EmergencyContactOut.model_validate(contact)


@router.put(
    "/me/contacts/{contact_id}",
    response_model=EmergencyContactOut,
    summary="Acil iletişim kişisini güncelle",
)
async def update_contact(
    contact_id: int,
    body: EmergencyContactIn,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> EmergencyContactOut:
    """Belirtilen acil iletişim kişisini günceller."""
    result = await db.execute(
        select(EmergencyContact).where(
            EmergencyContact.id == contact_id,
            EmergencyContact.user_id == current_user.id,
        )
    )
    contact = result.scalar_one_or_none()
    if not contact:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Kişi bulunamadı.")

    contact.name = body.name
    contact.phone = body.phone
    contact.email = body.email
    contact.relation = body.relation
    contact.methods = body.methods
    contact.priority = body.priority

    await db.commit()
    await db.refresh(contact)
    logger.info("Acil kişi güncellendi: user_id=%d contact_id=%d", current_user.id, contact_id)
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
    """Tüm bildirim ayarlarını günceller."""
    pref = await _get_or_create_pref(current_user, db)

    pref.min_magnitude = body.min_magnitude
    pref.locations = body.locations
    pref.push_enabled = body.push_enabled
    pref.sms_enabled = body.sms_enabled
    pref.email_enabled = body.email_enabled
    pref.quiet_hours_enabled = body.quiet_hours_enabled
    pref.quiet_start = body.quiet_start
    pref.quiet_end = body.quiet_end
    pref.weekly_summary = body.weekly_summary
    pref.aftershock_alerts = body.aftershock_alerts

    await db.commit()
    await db.refresh(pref)
    logger.info("Bildirim tercihi güncellendi: user_id=%d", current_user.id)
    return NotificationPrefOut.model_validate(pref)


# ─── "Ben İyiyim" Endpoint'i ─────────────────────────────────────────────────

@router.post(
    "/i-am-safe",
    status_code=status.HTTP_200_OK,
    summary="Ben İyiyim — acil kişilere bildirim gönder",
)
async def i_am_safe(
    body: ImSafeRequest = Body(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Kullanıcı deprem sonrası 'Ben İyiyim' butonuna basar.
    Acil iletişim kişilerine SMS ve/veya push bildirim gönderilir.
    """
    from app.services.fcm import send_i_am_safe as fcm_i_am_safe
    from app.services.twilio_sms import get_twilio_service

    # Acil kişileri DB'den çek
    contacts_result = await db.execute(
        select(EmergencyContact)
        .where(EmergencyContact.user_id == current_user.id)
        .order_by(EmergencyContact.priority.asc())
    )
    contacts = contacts_result.scalars().all()

    # Belirli kişiler seçildiyse filtrele
    target_contacts = contacts
    if body.contact_ids:
        target_contacts = [c for c in contacts if c.id in body.contact_ids]

    if not target_contacts:
        return {
            "status": "ok",
            "message": "Bildirim gönderilecek kişi bulunamadı.",
            "notified_contacts": 0,
            "total_contacts": len(contacts),
            "sms_sent": 0,
            "push_sent": 0,
        }

    # Mesaj oluştur
    user_name = current_user.name or current_user.email
    custom_msg = body.custom_message or "Ben iyiyim, endişelenmeyin!"
    sms_message = f"✅ {user_name} güvende: {custom_msg}"

    # Konum varsa ekle
    if body.include_location and body.latitude is not None and body.longitude is not None:
        sms_message += f"\n📍 Konum: https://maps.google.com/?q={body.latitude},{body.longitude}"

    # SMS gönder
    twilio = get_twilio_service()
    sms_sent = 0
    for contact in target_contacts:
        # SMS yöntemi seçilmişse veya varsayılan olarak gönder
        if contact.phone and ("sms" in (contact.methods or []) or "whatsapp" in (contact.methods or [])):
            if "whatsapp" in (contact.methods or []):
                success = await twilio.send_whatsapp(contact.phone, sms_message)
            else:
                success = await twilio.send_sms(contact.phone, sms_message)
            if success:
                sms_sent += 1
        elif contact.phone and not contact.methods:
            # Yöntem belirtilmemişse SMS gönder
            success = await twilio.send_sms(contact.phone, sms_message)
            if success:
                sms_sent += 1

    # FCM push bildirimi gönder (acil kişilerin FCM token'ı varsa)
    # Not: Acil kişiler ayrı kullanıcı olarak kayıtlıysa token'ları alınabilir
    # Şimdilik FCM push sadece log'lanır
    push_sent = 0
    logger.info(
        "Ben İyiyim: user_id=%d, hedef_kişi=%d, sms_sent=%d, push_sent=%d, konum=%s",
        current_user.id,
        len(target_contacts),
        sms_sent,
        push_sent,
        f"{body.latitude},{body.longitude}" if body.include_location and body.latitude else "Yok",
    )

    return {
        "status": "ok",
        "message": "Bildirim gönderildi.",
        "notified_contacts": len(target_contacts),
        "total_contacts": len(contacts),
        "sms_sent": sms_sent,
        "push_sent": push_sent,
    }