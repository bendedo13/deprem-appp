"""
Admin API endpoint'leri — yalnızca is_admin=True kullanıcılar erişebilir.
Kullanıcı yönetimi, deprem yönetimi, istatistik ve sistem kontrolü.
"""

import logging
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, EmailStr
from sqlalchemy import select, func, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.models.earthquake import Earthquake
from app.models.seismic_report import SeismicReport
from app.models.notification_pref import NotificationPref
from app.models.notification_log import NotificationLog
from app.models.app_settings import AppSettings, DEFAULT_SETTINGS
from app.dependencies import get_current_user, get_admin_user

logger = logging.getLogger(__name__)
router = APIRouter()


# ─── Admin Dependency ─────────────────────────────────────────────────────────
# get_admin_user artık app.dependencies'tan import ediliyor.


# ─── Schemas ──────────────────────────────────────────────────────────────────

class AdminUserOut(BaseModel):
    id: int
    email: str
    name: Optional[str] = None
    phone: Optional[str] = None
    plan: str = "free"
    subscription_plan: str = "free"
    subscription_expires_at: Optional[datetime] = None
    trial_used: bool = False
    is_active: bool
    is_admin: bool
    fcm_token: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    created_at: datetime
    model_config = {"from_attributes": True}


class AdminUserUpdateIn(BaseModel):
    is_active: Optional[bool] = None
    is_admin: Optional[bool] = None
    subscription_plan: Optional[str] = None
    subscription_expires_at: Optional[datetime] = None


class AdminStats(BaseModel):
    total_users: int
    active_users: int
    admin_users: int
    pro_users: int
    trial_users: int
    free_users: int
    total_earthquakes: int
    earthquakes_last_24h: int
    earthquakes_last_7d: int
    seismic_reports_total: int
    users_with_fcm: int
    users_with_location: int
    total_notifications_sent: int


class AdminEarthquakeOut(BaseModel):
    id: int
    external_id: Optional[str] = None
    source: Optional[str] = None
    magnitude: float
    depth: Optional[float] = None
    latitude: float
    longitude: float
    location: Optional[str] = None
    occurred_at: datetime
    fetched_at: datetime
    model_config = {"from_attributes": True}


class AdminEarthquakeCreateIn(BaseModel):
    magnitude: float
    depth: float = 10.0
    latitude: float
    longitude: float
    location: str
    occurred_at: Optional[datetime] = None
    source: str = "manual"


# ─── Dashboard Stats ──────────────────────────────────────────────────────────

@router.get("/stats", response_model=AdminStats, summary="Admin dashboard istatistikleri")
async def admin_stats(
    _: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
) -> AdminStats:
    """Tüm sisteme ait temel istatistikleri döner."""
    now = datetime.now(tz=timezone.utc)

    total_users = (await db.execute(select(func.count(User.id)))).scalar_one()
    active_users = (await db.execute(select(func.count(User.id)).where(User.is_active == True))).scalar_one()
    admin_users = (await db.execute(select(func.count(User.id)).where(User.is_admin == True))).scalar_one()
    pro_users = (await db.execute(select(func.count(User.id)).where(
        User.subscription_plan.in_(["monthly_pro", "yearly_pro"])
    ))).scalar_one()
    trial_users = (await db.execute(select(func.count(User.id)).where(
        User.subscription_plan == "trial"
    ))).scalar_one()
    free_users = (await db.execute(select(func.count(User.id)).where(
        User.subscription_plan == "free"
    ))).scalar_one()
    users_with_fcm = (await db.execute(select(func.count(User.id)).where(User.fcm_token.isnot(None)))).scalar_one()
    users_with_location = (await db.execute(select(func.count(User.id)).where(User.latitude.isnot(None)))).scalar_one()

    total_eq = (await db.execute(select(func.count(Earthquake.id)))).scalar_one()
    eq_24h = (await db.execute(
        select(func.count(Earthquake.id)).where(Earthquake.occurred_at >= now - timedelta(hours=24))
    )).scalar_one()
    eq_7d = (await db.execute(
        select(func.count(Earthquake.id)).where(Earthquake.occurred_at >= now - timedelta(days=7))
    )).scalar_one()
    seismic_total = (await db.execute(select(func.count(SeismicReport.id)))).scalar_one()
    
    total_notifications = (await db.execute(select(func.coalesce(func.sum(NotificationLog.sent_count), 0)))).scalar_one()

    return AdminStats(
        total_users=total_users,
        active_users=active_users,
        admin_users=admin_users,
        pro_users=pro_users,
        trial_users=trial_users,
        free_users=free_users,
        total_earthquakes=total_eq,
        earthquakes_last_24h=eq_24h,
        earthquakes_last_7d=eq_7d,
        seismic_reports_total=seismic_total,
        users_with_fcm=users_with_fcm,
        users_with_location=users_with_location,
        total_notifications_sent=total_notifications,
    )


# ─── User Management ─────────────────────────────────────────────────────────

@router.get("/users", response_model=List[AdminUserOut], summary="Tüm kullanıcıları listele")
async def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
    search: Optional[str] = Query(None),
    _: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
) -> List[AdminUserOut]:
    """Tüm kullanıcıları döner. E-posta ile arama yapılabilir."""
    q = select(User).order_by(User.id.desc()).offset(skip).limit(limit)
    if search:
        q = q.where(User.email.ilike(f"%{search}%"))
    result = await db.execute(q)
    return [AdminUserOut.model_validate(u) for u in result.scalars().all()]


@router.get("/users/{user_id}", response_model=AdminUserOut, summary="Kullanıcı detayı")
async def get_user(
    user_id: int,
    _: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
) -> AdminUserOut:
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı.")
    return AdminUserOut.model_validate(user)


@router.patch("/users/{user_id}", response_model=AdminUserOut, summary="Kullanıcı güncelle")
async def update_user(
    user_id: int,
    body: AdminUserUpdateIn,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
) -> AdminUserOut:
    """Kullanıcı is_active, is_admin ve abonelik alanlarını günceller."""
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı.")
    if user.id == admin.id and body.is_admin is False:
        raise HTTPException(status_code=400, detail="Kendi admin yetkini kaldıramazsın.")
    if body.is_active is not None:
        user.is_active = body.is_active
    if body.is_admin is not None:
        user.is_admin = body.is_admin
    if body.subscription_plan is not None:
        user.subscription_plan = body.subscription_plan
    if body.subscription_expires_at is not None:
        user.subscription_expires_at = body.subscription_expires_at
    await db.commit()
    await db.refresh(user)
    logger.info("Admin kullanıcı güncelledi: admin=%d target=%d", admin.id, user_id)
    return AdminUserOut.model_validate(user)


@router.delete("/users/{user_id}", status_code=204, summary="Kullanıcı sil")
async def delete_user(
    user_id: int,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    """Kullanıcıyı kalıcı olarak siler. Kendi hesabını silemezsin."""
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="Kendi hesabını silemezsin.")
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı.")
    await db.delete(user)
    await db.commit()
    logger.info("Admin kullanıcı sildi: admin=%d deleted=%d", admin.id, user_id)


# ─── Earthquake Management ────────────────────────────────────────────────────

@router.get("/earthquakes", response_model=List[AdminEarthquakeOut], summary="Tüm depremleri listele")
async def list_earthquakes_admin(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    min_magnitude: float = Query(0.0),
    _: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
) -> List[AdminEarthquakeOut]:
    """Depremleri listeler. Filtreler: min_magnitude, sayfalama."""
    result = await db.execute(
        select(Earthquake)
        .where(Earthquake.magnitude >= min_magnitude)
        .order_by(Earthquake.occurred_at.desc())
        .offset(skip)
        .limit(limit)
    )
    return [AdminEarthquakeOut.model_validate(e) for e in result.scalars().all()]


@router.post("/earthquakes", response_model=AdminEarthquakeOut, status_code=201, summary="Manuel deprem ekle")
async def create_earthquake_admin(
    body: AdminEarthquakeCreateIn,
    _: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
) -> AdminEarthquakeOut:
    """Test ya da tarihsel veri girmek için manuel deprem kaydı oluşturur."""
    quake = Earthquake(
        external_id=f"manual-{datetime.now(tz=timezone.utc).timestamp()}",
        source=body.source,
        magnitude=body.magnitude,
        depth=body.depth,
        latitude=body.latitude,
        longitude=body.longitude,
        location=body.location,
        occurred_at=body.occurred_at or datetime.now(tz=timezone.utc),
    )
    db.add(quake)
    await db.commit()
    await db.refresh(quake)
    logger.info("Manuel deprem eklendi: id=%d mag=%.1f", quake.id, quake.magnitude)
    return AdminEarthquakeOut.model_validate(quake)


@router.delete("/earthquakes/{quake_id}", status_code=204, summary="Deprem sil")
async def delete_earthquake_admin(
    quake_id: int,
    _: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    quake = await db.get(Earthquake, quake_id)
    if not quake:
        raise HTTPException(status_code=404, detail="Deprem bulunamadı.")
    await db.delete(quake)
    await db.commit()


# ─── Broadcast Notification ──────────────────────────────────────────────────

class BroadcastIn(BaseModel):
    title: str
    body: str
    image_url: Optional[str] = None
    target_user_id: Optional[int] = None  # None → broadcast, int → tek kullanıcı
    only_active: bool = True
    data: Optional[dict] = None  # Ek veri (aksiyonlar vs.)


class NotificationLogOut(BaseModel):
    id: int
    title: str
    body: str
    image_url: Optional[str] = None
    target_type: str
    target_user_id: Optional[int] = None
    total_targets: int
    sent_count: int
    failed_count: int
    sent_by: Optional[int] = None
    created_at: datetime
    model_config = {"from_attributes": True}


@router.post("/broadcast", status_code=200, summary="Bildirim gönder (broadcast veya tek kullanıcı)")
async def broadcast_notification(
    body: BroadcastIn,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    FCM push bildirim gönderir.
    - target_user_id=None → tüm kullanıcılara broadcast
    - target_user_id=<id> → tek kullanıcıya özel bildirim
    Görsel, başlık, mesaj ve ek veri destekler.
    """
    from app.services.fcm import send_rich_multicast, send_rich_single

    target_type = "broadcast"
    tokens = []

    if body.target_user_id:
        # Tek kullanıcıya gönder
        target_type = "user"
        target_user = await db.get(User, body.target_user_id)
        if not target_user or not target_user.fcm_token:
            raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı veya FCM token'ı yok.")
        tokens = [target_user.fcm_token]
    else:
        # Broadcast
        q = select(User).where(User.fcm_token.isnot(None))
        if body.only_active:
            q = q.where(User.is_active == True)
        result = await db.execute(q)
        users = result.scalars().all()
        tokens = [u.fcm_token for u in users if u.fcm_token]

    if not tokens:
        return {"sent": 0, "message": "FCM token'ı olan kullanıcı yok."}

    sent = await send_rich_multicast(
        tokens=tokens,
        title=body.title,
        body=body.body,
        image_url=body.image_url,
        data=body.data,
    )

    # Log kaydet
    log_entry = NotificationLog(
        title=body.title,
        body=body.body,
        image_url=body.image_url,
        target_type=target_type,
        target_user_id=body.target_user_id,
        total_targets=len(tokens),
        sent_count=sent,
        failed_count=len(tokens) - sent,
        sent_by=admin.id,
        data=body.data,
    )
    db.add(log_entry)
    await db.commit()

    logger.info("Notification sent: admin=%d type=%s targets=%d sent=%d", admin.id, target_type, len(tokens), sent)
    return {"sent": sent, "total_targets": len(tokens), "type": target_type}


@router.get("/notifications", response_model=List[NotificationLogOut], summary="Bildirim geçmişi")
async def list_notification_logs(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    _: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
) -> List[NotificationLogOut]:
    """Gönderilen bildirimlerin geçmişini döner."""
    result = await db.execute(
        select(NotificationLog).order_by(NotificationLog.id.desc()).offset(skip).limit(limit)
    )
    return [NotificationLogOut.model_validate(n) for n in result.scalars().all()]


# ─── Admin Password Change ───────────────────────────────────────────────────

class AdminPasswordChangeIn(BaseModel):
    current_password: str
    new_password: str


@router.put("/change-password", summary="Admin şifre değiştir")
async def admin_change_password(
    body: AdminPasswordChangeIn,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Admin kendi şifresini güvenli şekilde değiştirir."""
    from app.services.auth import verify_password, hash_password

    if not verify_password(body.current_password, admin.password_hash):
        raise HTTPException(status_code=400, detail="Mevcut şifre yanlış.")
    if len(body.new_password) < 8:
        raise HTTPException(status_code=400, detail="Yeni şifre en az 8 karakter olmalı.")

    admin.password_hash = hash_password(body.new_password)
    await db.commit()
    logger.info("Admin password changed: admin_id=%d", admin.id)
    return {"success": True, "message": "Şifreniz başarıyla değiştirildi."}


# ─── App Settings ────────────────────────────────────────────────────────────

class AppSettingOut(BaseModel):
    key: str
    value: str
    description: Optional[str] = None
    updated_at: datetime
    model_config = {"from_attributes": True}


class AppSettingUpdateIn(BaseModel):
    value: str


@router.get("/settings", response_model=List[AppSettingOut], summary="Tüm uygulama ayarlarını listele")
async def list_settings(
    _: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
) -> List[AppSettingOut]:
    """Admin panelinden yönetilebilir uygulama ayarlarını döner."""
    result = await db.execute(select(AppSettings).order_by(AppSettings.key))
    settings = result.scalars().all()

    # Varsayılan ayarlar yoksa oluştur
    if not settings:
        for s in DEFAULT_SETTINGS:
            db.add(AppSettings(**s))
        await db.commit()
        result = await db.execute(select(AppSettings).order_by(AppSettings.key))
        settings = result.scalars().all()

    return [AppSettingOut.model_validate(s) for s in settings]


@router.get("/settings/{key}", response_model=AppSettingOut, summary="Tek bir ayarı getir")
async def get_setting(
    key: str,
    _: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
) -> AppSettingOut:
    setting = await db.get(AppSettings, key)
    if not setting:
        raise HTTPException(status_code=404, detail=f"Ayar bulunamadı: {key}")
    return AppSettingOut.model_validate(setting)


@router.put("/settings/{key}", response_model=AppSettingOut, summary="Ayar güncelle")
async def update_setting(
    key: str,
    body: AppSettingUpdateIn,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
) -> AppSettingOut:
    """
    Ayar değerini günceller. Geçerli anahtarlar:
    - earthquake_limit: Sayı (örn: "20", "50")
    - active_sources: JSON dizi (örn: '["afad","kandilli"]')
    - simulation_enabled: "true" veya "false"
    - early_warning_enabled: "true" veya "false"
    """
    setting = await db.get(AppSettings, key)
    if not setting:
        raise HTTPException(status_code=404, detail=f"Ayar bulunamadı: {key}")
    setting.value = body.value
    await db.commit()
    await db.refresh(setting)
    logger.info("Admin ayar güncelledi: admin=%d key=%s value=%s", admin.id, key, body.value)
    return AppSettingOut.model_validate(setting)


@router.post("/settings/init", status_code=200, summary="Varsayılan ayarları oluştur")
async def init_settings(
    _: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Eksik varsayılan ayarları veritabanına ekler. Mevcutları değiştirmez."""
    created = []
    for s in DEFAULT_SETTINGS:
        existing = await db.get(AppSettings, s["key"])
        if not existing:
            db.add(AppSettings(**s))
            created.append(s["key"])
    await db.commit()
    return {"created": created, "message": f"{len(created)} ayar oluşturuldu."}


# ─── System ──────────────────────────────────────────────────────────────────

@router.post("/make-admin", status_code=200, summary="E-posta ile kullanıcıyı admin yap")
async def make_admin_by_email(
    email: EmailStr,
    _: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """E-posta ile kullanıcıyı admin yapar."""
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı.")
    user.is_admin = True
    await db.commit()
    return {"ok": True, "message": f"{email} admin yapıldı."}
