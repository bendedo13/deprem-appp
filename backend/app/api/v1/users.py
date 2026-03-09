"""
Kullanıcı kayıt, giriş, profil, acil iletişim ve bildirim tercihi endpoint'leri.
rules.md: type hints, Pydantic validation, async, logging, JWT auth, max 50 satır/fonksiyon.
"""

import logging
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.models.emergency_contact import EmergencyContact
from app.models.notification_pref import NotificationPref
from app.dependencies import get_current_user
from app.schemas.user import (
    UserRegisterIn, UserLoginIn, UserUpdateIn, UserOut, TokenOut,
    ProfileUpdate, PasswordChange, ImSafeRequest
)
from app.schemas.emergency_contact import EmergencyContactIn, EmergencyContactOut
from app.schemas.notification_pref import NotificationPrefIn, NotificationPrefOut
from app.services.auth import hash_password, verify_password, create_access_token, decode_token, verify_firebase_token

logger = logging.getLogger(__name__)
router = APIRouter()

# Acil kişi limiti
_MAX_EMERGENCY_CONTACTS = 5


# ─── Auth Endpoint'leri ───────────────────────────────────────────────────────

@router.post(
    "/register",
    response_model=TokenOut,
    status_code=status.HTTP_201_CREATED,
    summary="Yeni kullanıcı kaydı",
)
async def register(body: UserRegisterIn, db: AsyncSession = Depends(get_db)) -> TokenOut:
    """E-posta ve şifre ile kullanıcı oluşturur. Aynı e-posta varsa 409 döner. E-posta küçük harfe çevrilir."""
    email_normalized = body.email.strip().lower()
    existing = await db.execute(select(User).where(User.email == email_normalized))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Bu e-posta adresi zaten kayıtlı.")

    user = User(email=email_normalized, password_hash=hash_password(body.password))
    db.add(user)
    await db.commit()
    await db.refresh(user)

    token = create_access_token(user.id, user.email)
    logger.info("Yeni kullanıcı kaydedildi: id=%d email=%s", user.id, user.email)
    return TokenOut(access_token=token, user=UserOut.model_validate(user))


@router.post("/login", response_model=TokenOut, summary="Kullanıcı girişi")
async def login(body: UserLoginIn, db: AsyncSession = Depends(get_db)) -> TokenOut:
    """E-posta/şifre doğrular, JWT döner. E-posta küçük harfe çevrilir. Hatalı bilgide 401."""
    email_normalized = body.email.strip().lower()
    result = await db.execute(select(User).where(User.email == email_normalized))
    user = result.scalar_one_or_none()

    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="E-posta veya şifre hatalı.")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Hesap devre dışı.")

    token = create_access_token(user.id, user.email)
    logger.info("Kullanıcı girişi: id=%d", user.id)
    return TokenOut(access_token=token, user=UserOut.model_validate(user))


@router.post("/auth/firebase", response_model=TokenOut, summary="Firebase token ile giriş/kayıt")
async def firebase_auth_login(
    body: dict = Body(..., example={"firebase_token": "eyJ..."}),
    db: AsyncSession = Depends(get_db),
) -> TokenOut:
    """
    Firebase ID token doğrular. Kullanıcı DB'de yoksa otomatik oluşturur.
    Google Sign-In ve Firebase Email/Password ile giriş yapan kullanıcılar için.
    """
    from app.services.auth import _firebase_available

    if not _firebase_available:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Firebase servisi yapılandırılmamış.",
        )

    firebase_token = body.get("firebase_token")
    if not firebase_token:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="firebase_token gerekli.")

    decoded = verify_firebase_token(firebase_token)
    if not decoded:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Firebase token doğrulanamadı. Yeniden giriş yapın.",
        )

    email = decoded.get("email")
    if not email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Firebase token'da e-posta bulunamadı.")
    email_normalized = email.strip().lower()

    # Kullanıcıyı DB'de bul veya oluştur
    result = await db.execute(select(User).where(User.email == email_normalized))
    user = result.scalar_one_or_none()

    if not user:
        user = User(
            email=email_normalized,
            password_hash="firebase_auth",
            name=decoded.get("name"),
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        logger.info("Firebase ile yeni kullanıcı: id=%d email=%s", user.id, user.email)
    elif not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Hesap devre dışı.")

    token = create_access_token(user.id, user.email)
    logger.info("Firebase auth giriş: id=%d", user.id)
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
    # Cascade delete should handle related data (contacts, prefs) if configured in DB
    # If not, manual delete might be needed. Using SQLAlchemy cascade="all, delete-orphan" in models.
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
    result = await db.execute(
        select(EmergencyContact)
        .where(EmergencyContact.user_id == current_user.id)
        .order_by(EmergencyContact.id)
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
    count_result = await db.execute(
        select(func.count()).select_from(EmergencyContact).where(EmergencyContact.user_id == current_user.id)
    )
    contact_count = count_result.scalar_one()
    if contact_count >= _MAX_EMERGENCY_CONTACTS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"En fazla {_MAX_EMERGENCY_CONTACTS} acil iletişim kişisi eklenebilir.",
        )

    contact = EmergencyContact(
        user_id=current_user.id,
        name=body.name,
        phone_number=body.phone_number,
        relationship=body.relationship,
        is_active=True,
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
    Acil iletişim kişilerinin FCM token'ları toplanır ve push bildirim gönderilir.
    """
    from app.services.fcm import send_i_am_safe  # geç import - circular dependency önlemek için

    # TODO: Gerçek FCM servisi entegre edilecek.
    # Şimdilik dummy response.

    # Acil kişileri async ile yükle (sadece aktif olanlar)
    contacts_result = await db.execute(
        select(EmergencyContact).where(
            EmergencyContact.user_id == current_user.id,
            EmergencyContact.is_active == True,
        )
    )
    contacts = contacts_result.scalars().all()

    # Filtreleme (belirli kişiler seçildiyse)
    target_contacts = list(contacts)
    if body.contact_ids:
        target_contacts = [c for c in contacts if c.id in body.contact_ids]

    # Hibrit SMS + Twilio WhatsApp + şablon engine
    from app.services.sos_service import send_hybrid_via_twilio, render_template_async

    # Telefonu olan aktif güvenilir kişilere hibrit kanal ile gönderim
    contacts_with_phone = [c for c in target_contacts if c.phone_number]

    if not contacts_with_phone:
        return {
            "status": "ok",
            "message": "Güvenilir kişi listesine telefon numarası ekleyin; S.O.S bu numaralara gönderilir.",
            "notified_contacts": 0,
            "total_contacts": len(contacts),
            "sms_sent": 0,
            "whatsapp_sent": 0,
            "channel_used": "none",
        }

    phone_numbers = [c.phone_number for c in contacts_with_phone]
    channel = (body.channel or "hybrid").lower()

    # Şablon için context hazırla
    user_name = current_user.name or current_user.email
    custom_message = body.custom_message or "Ben iyiyim!"
    maps_url = ""
    if body.include_location and body.latitude and body.longitude:
        maps_url = f"https://maps.google.com/?q={body.latitude},{body.longitude}"

    default_template = "{user_name} güvende: {custom_message}\nKonum: {maps_url}"
    message = await render_template_async(
        db,
        key="sos_safe_template",
        default=default_template,
        context={
            "user_name": user_name,
            "custom_message": custom_message,
            "maps_url": maps_url,
        },
    )

    try:
        result = await send_hybrid_via_twilio(phone_numbers, message, channel=channel)  # type: ignore[arg-type]
    except Exception as e:
        logger.error("Hibrit S.O.S hatası: %s", e)
        return {
            "status": "error",
            "message": "S.O.S mesajı gönderilemedi. Lütfen daha sonra tekrar deneyin.",
            "notified_contacts": 0,
            "total_contacts": len(contacts),
            "sms_sent": 0,
            "whatsapp_sent": 0,
            "channel_used": "none",
            "detail": str(e),
        }

    sms_sent = result["sms_sent"]
    whatsapp_sent = result["whatsapp_sent"]

    if sms_sent > 0 and whatsapp_sent > 0:
        channel_used = "sms+whatsapp"
        user_message = "SMS ve WhatsApp üzerinden bilgilendirme yapıldı."
    elif sms_sent > 0:
        channel_used = "sms"
        user_message = "SMS üzerinden bilgilendirme yapıldı."
    elif whatsapp_sent > 0:
        channel_used = "whatsapp"
        user_message = "WhatsApp üzerinden bilgilendirme yapıldı."
    else:
        channel_used = "none"
        user_message = "Hiçbir kanaldan S.O.S mesajı gönderilemedi."

    logger.info(
        "Ben İyiyim Hibrit: user_id=%d, location=%s, sms_sent=%d, whatsapp_sent=%d, contacts=%d",
        current_user.id,
        "Var" if body.include_location and body.latitude and body.longitude else "Yok",
        sms_sent,
        whatsapp_sent,
        len(contacts_with_phone),
    )

    return {
        "status": "ok" if channel_used != "none" else "error",
        "message": user_message,
        "notified_contacts": sms_sent or whatsapp_sent,
        "total_contacts": len(contacts),
        "sms_sent": sms_sent,
        "whatsapp_sent": whatsapp_sent,
        "channel_used": channel_used,
    }
