"""
Admin API endpoint'leri — yalnızca is_admin=True kullanıcılar erişebilir.
Kullanıcı yönetimi, deprem yönetimi, SOS kayıtları, istatistik ve sistem kontrolü.
"""

import logging
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from fastapi import APIRouter, Body, Depends, HTTPException, Query, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select, func, delete, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.models.earthquake import Earthquake
from app.models.seismic_report import SeismicReport
from app.models.notification_pref import NotificationPref
from app.models.sos_record import SOSRecord
from app.api.v1.users import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()


# ─── Admin Dependency ─────────────────────────────────────────────────────────

async def get_admin_user(current_user: User = Depends(get_current_user)) -> User:
    """JWT doğrulamasına ek olarak is_admin kontrolü yapar."""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bu endpoint yalnızca admin kullanıcılara açıktır.",
        )
    return current_user


# ─── Schemas ──────────────────────────────────────────────────────────────────

class AdminUserOut(BaseModel):
    """Admin paneli için genişletilmiş kullanıcı bilgisi."""
    id: int
    email: str
    is_active: bool
    is_admin: bool
    name: Optional[str] = None
    phone: Optional[str] = None
    avatar: Optional[str] = None
    plan: str = "free"
    fcm_token: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    created_at: datetime
    join_date: Optional[datetime] = None

    model_config = {"from_attributes": True}


class AdminUserUpdateIn(BaseModel):
    """Admin kullanıcı güncelleme isteği."""
    is_active: Optional[bool] = None
    is_admin: Optional[bool] = None
    plan: Optional[str] = Field(None, pattern="^(free|premium|enterprise)$")


class AdminStats(BaseModel):
    """Admin dashboard istatistikleri."""
    total_users: int
    active_users: int
    admin_users: int
    total_earthquakes: int
    earthquakes_last_24h: int
    earthquakes_last_7d: int
    seismic_reports_total: int
    sos_records_total: int
    sos_records_last_24h: int
    users_with_fcm: int
    users_with_location: int
    premium_users: int


class AdminEarthquakeOut(BaseModel):
    """Admin deprem listesi yanıtı."""
    id: str
    source: Optional[str] = None
    magnitude: float
    depth: Optional[float] = None
    latitude: float
    longitude: float
    location: Optional[str] = None
    occurred_at: datetime
    created_at: datetime

    model_config = {"from_attributes": True}


class AdminEarthquakeCreateIn(BaseModel):
    """Manuel deprem oluşturma isteği."""
    magnitude: float = Field(..., ge=0.1, le=10.0)
    depth: float = Field(default=10.0, ge=0.0)
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    location: str = Field(..., min_length=1, max_length=256)
    occurred_at: Optional[datetime] = None
    source: str = Field(default="manual", max_length=16)


class AdminSOSRecordOut(BaseModel):
    """Admin SOS kayıt listesi yanıtı."""
    id: str
    user_id: int
    durum: str
    kisi_sayisi: int
    aciliyet: str
    lokasyon: str
    orijinal_metin: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    processing_status: Optional[str] = None
    error_message: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class BroadcastIn(BaseModel):
    """Toplu bildirim isteği."""
    title: str = Field(..., min_length=1, max_length=100)
    body: str = Field(..., min_length=1, max_length=500)
    only_active: bool = True


class MakeAdminIn(BaseModel):
    """Admin yapma isteği."""
    email: EmailStr


# ─── Dashboard Stats ──────────────────────────────────────────────────────────

@router.get(
    "/stats",
    response_model=AdminStats,
    summary="Admin dashboard istatistikleri",
)
async def admin_stats(
    _: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
) -> AdminStats:
    """Tüm sisteme ait temel istatistikleri döner."""
    now = datetime.now(tz=timezone.utc)

    # Kullanıcı istatistikleri
    total_users = (await db.execute(
        select(func.count(User.id))
    )).scalar_one()

    active_users = (await db.execute(
        select(func.count(User.id)).where(User.is_active == True)  # noqa: E712
    )).scalar_one()

    admin_users = (await db.execute(
        select(func.count(User.id)).where(User.is_admin == True)  # noqa: E712
    )).scalar_one()

    premium_users = (await db.execute(
        select(func.count(User.id)).where(User.plan != "free")
    )).scalar_one()

    users_with_fcm = (await db.execute(
        select(func.count(User.id)).where(User.fcm_token.isnot(None))
    )).scalar_one()

    users_with_location = (await db.execute(
        select(func.count(User.id)).where(User.latitude.isnot(None))
    )).scalar_one()

    # Deprem istatistikleri
    total_eq = (await db.execute(
        select(func.count(Earthquake.id))
    )).scalar_one()

    eq_24h = (await db.execute(
        select(func.count(Earthquake.id)).where(
            Earthquake.occurred_at >= now - timedelta(hours=24)
        )
    )).scalar_one()

    eq_7d = (await db.execute(
        select(func.count(Earthquake.id)).where(
            Earthquake.occurred_at >= now - timedelta(days=7)
        )
    )).scalar_one()

    # Sismik rapor istatistikleri
    seismic_total = (await db.execute(
        select(func.count(SeismicReport.id))
    )).scalar_one()

    # SOS kayıt istatistikleri
    sos_total = (await db.execute(
        select(func.count(SOSRecord.id))
    )).scalar_one()

    sos_24h = (await db.execute(
        select(func.count(SOSRecord.id)).where(
            SOSRecord.created_at >= now - timedelta(hours=24)
        )
    )).scalar_one()

    return AdminStats(
        total_users=total_users,
        active_users=active_users,
        admin_users=admin_users,
        total_earthquakes=total_eq,
        earthquakes_last_24h=eq_24h,
        earthquakes_last_7d=eq_7d,
        seismic_reports_total=seismic_total,
        sos_records_total=sos_total,
        sos_records_last_24h=sos_24h,
        users_with_fcm=users_with_fcm,
        users_with_location=users_with_location,
        premium_users=premium_users,
    )


# ─── User Management ─────────────────────────────────────────────────────────

@router.get(
    "/users",
    response_model=List[AdminUserOut],
    summary="Tüm kullanıcıları listele",
)
async def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
    search: Optional[str] = Query(None, description="E-posta veya isim ile ara"),
    is_active: Optional[bool] = Query(None, description="Aktif/pasif filtresi"),
    is_admin: Optional[bool] = Query(None, description="Admin filtresi"),
    plan: Optional[str] = Query(None, description="Plan filtresi (free/premium/enterprise)"),
    _: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
) -> List[AdminUserOut]:
    """Tüm kullanıcıları döner. E-posta/isim ile arama ve filtreler desteklenir."""
    q = select(User).order_by(User.id.desc()).offset(skip).limit(limit)

    # Arama filtresi
    if search:
        q = q.where(
            User.email.ilike(f"%{search}%") | User.name.ilike(f"%{search}%")
        )

    # Durum filtreleri
    if is_active is not None:
        q = q.where(User.is_active == is_active)
    if is_admin is not None:
        q = q.where(User.is_admin == is_admin)
    if plan is not None:
        q = q.where(User.plan == plan)

    result = await db.execute(q)
    return [AdminUserOut.model_validate(u) for u in result.scalars().all()]


@router.get(
    "/users/count",
    summary="Kullanıcı sayısını getir",
)
async def count_users(
    search: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    plan: Optional[str] = Query(None),
    _: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Filtrelenmiş kullanıcı sayısını döner (sayfalama için)."""
    q = select(func.count(User.id))

    if search:
        q = q.where(
            User.email.ilike(f"%{search}%") | User.name.ilike(f"%{search}%")
        )
    if is_active is not None:
        q = q.where(User.is_active == is_active)
    if plan is not None:
        q = q.where(User.plan == plan)

    count = (await db.execute(q)).scalar_one()
    return {"count": count}


@router.get(
    "/users/{user_id}",
    response_model=AdminUserOut,
    summary="Kullanıcı detayı",
)
async def get_user(
    user_id: int,
    _: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
) -> AdminUserOut:
    """Belirtilen kullanıcının detayını döner."""
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı.")
    return AdminUserOut.model_validate(user)


@router.patch(
    "/users/{user_id}",
    response_model=AdminUserOut,
    summary="Kullanıcı güncelle",
)
async def update_user(
    user_id: int,
    body: AdminUserUpdateIn,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
) -> AdminUserOut:
    """Kullanıcı is_active, is_admin ve plan alanlarını günceller."""
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı.")

    # Kendi admin yetkisini kaldırmayı engelle
    if user.id == admin.id and body.is_admin is False:
        raise HTTPException(
            status_code=400,
            detail="Kendi admin yetkini kaldıramazsın.",
        )

    if body.is_active is not None:
        user.is_active = body.is_active
    if body.is_admin is not None:
        user.is_admin = body.is_admin
    if body.plan is not None:
        user.plan = body.plan

    await db.commit()
    await db.refresh(user)
    logger.info(
        "Admin kullanıcı güncelledi: admin=%d target=%d",
        admin.id,
        user_id,
    )
    return AdminUserOut.model_validate(user)


@router.delete(
    "/users/{user_id}",
    status_code=204,
    summary="Kullanıcı sil",
)
async def delete_user(
    user_id: int,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    """Kullanıcıyı kalıcı olarak siler. Kendi hesabını silemezsin."""
    if user_id == admin.id:
        raise HTTPException(
            status_code=400,
            detail="Kendi hesabını silemezsin.",
        )
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı.")

    await db.delete(user)
    await db.commit()
    logger.info("Admin kullanıcı sildi: admin=%d deleted=%d", admin.id, user_id)


# ─── Earthquake Management ────────────────────────────────────────────────────

@router.get(
    "/earthquakes",
    response_model=List[AdminEarthquakeOut],
    summary="Tüm depremleri listele",
)
async def list_earthquakes_admin(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    min_magnitude: float = Query(0.0, ge=0.0),
    source: Optional[str] = Query(None, description="Kaynak filtresi (afad/kandilli/usgs/emsc/manual)"),
    hours: Optional[int] = Query(None, ge=1, le=8760, description="Son kaç saatlik veri"),
    _: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
) -> List[AdminEarthquakeOut]:
    """Depremleri listeler. Filtreler: min_magnitude, source, hours, sayfalama."""
    q = (
        select(Earthquake)
        .where(Earthquake.magnitude >= min_magnitude)
        .order_by(Earthquake.occurred_at.desc())
        .offset(skip)
        .limit(limit)
    )

    if source:
        q = q.where(Earthquake.source == source)

    if hours:
        since = datetime.now(tz=timezone.utc) - timedelta(hours=hours)
        q = q.where(Earthquake.occurred_at >= since)

    result = await db.execute(q)
    return [AdminEarthquakeOut.model_validate(e) for e in result.scalars().all()]


@router.post(
    "/earthquakes",
    response_model=AdminEarthquakeOut,
    status_code=201,
    summary="Manuel deprem ekle",
)
async def create_earthquake_admin(
    body: AdminEarthquakeCreateIn,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
) -> AdminEarthquakeOut:
    """Test ya da tarihsel veri girmek için manuel deprem kaydı oluşturur."""
    now = datetime.now(tz=timezone.utc)
    # Benzersiz ID oluştur
    unique_id = f"manual-{int(now.timestamp())}-{admin.id}"

    quake = Earthquake(
        id=unique_id,
        source=body.source,
        magnitude=body.magnitude,
        depth=body.depth,
        latitude=body.latitude,
        longitude=body.longitude,
        location=body.location,
        occurred_at=body.occurred_at or now,
    )
    db.add(quake)
    await db.commit()
    await db.refresh(quake)
    logger.info(
        "Manuel deprem eklendi: id=%s mag=%.1f admin=%d",
        quake.id,
        quake.magnitude,
        admin.id,
    )
    return AdminEarthquakeOut.model_validate(quake)


@router.delete(
    "/earthquakes/{quake_id}",
    status_code=204,
    summary="Deprem sil",
)
async def delete_earthquake_admin(
    quake_id: str,
    _: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    """Belirtilen depremi siler."""
    quake = await db.get(Earthquake, quake_id)
    if not quake:
        raise HTTPException(status_code=404, detail="Deprem bulunamadı.")
    await db.delete(quake)
    await db.commit()
    logger.info("Deprem silindi: id=%s", quake_id)


# ─── SOS Records Management ──────────────────────────────────────────────────

@router.get(
    "/sos-records",
    response_model=List[AdminSOSRecordOut],
    summary="Tüm SOS kayıtlarını listele",
)
async def list_sos_records(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
    aciliyet: Optional[str] = Query(None, description="Aciliyet filtresi (dusuk/orta/yuksek/kritik)"),
    processing_status: Optional[str] = Query(None, description="İşleme durumu filtresi"),
    user_id: Optional[int] = Query(None, description="Kullanıcı ID filtresi"),
    _: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
) -> List[AdminSOSRecordOut]:
    """Tüm SOS kayıtlarını listeler. Filtreler: aciliyet, durum, kullanıcı."""
    q = (
        select(SOSRecord)
        .order_by(SOSRecord.created_at.desc())
        .offset(skip)
        .limit(limit)
    )

    if aciliyet:
        q = q.where(SOSRecord.aciliyet == aciliyet)
    if processing_status:
        q = q.where(SOSRecord.processing_status == processing_status)
    if user_id:
        q = q.where(SOSRecord.user_id == user_id)

    result = await db.execute(q)
    return [AdminSOSRecordOut.model_validate(r) for r in result.scalars().all()]


@router.get(
    "/sos-records/{sos_id}",
    response_model=AdminSOSRecordOut,
    summary="SOS kaydı detayı",
)
async def get_sos_record_admin(
    sos_id: str,
    _: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
) -> AdminSOSRecordOut:
    """Belirtilen SOS kaydının detayını döner."""
    result = await db.execute(
        select(SOSRecord).where(SOSRecord.id == sos_id)
    )
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="SOS kaydı bulunamadı.")
    return AdminSOSRecordOut.model_validate(record)


@router.delete(
    "/sos-records/{sos_id}",
    status_code=204,
    summary="SOS kaydını sil",
)
async def delete_sos_record_admin(
    sos_id: str,
    _: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    """Belirtilen SOS kaydını siler."""
    result = await db.execute(
        select(SOSRecord).where(SOSRecord.id == sos_id)
    )
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="SOS kaydı bulunamadı.")
    await db.delete(record)
    await db.commit()
    logger.info("SOS kaydı silindi: id=%s", sos_id)


# ─── Broadcast Notification ──────────────────────────────────────────────────

@router.post(
    "/broadcast",
    status_code=200,
    summary="Tüm kullanıcılara push bildirim gönder",
)
async def broadcast_notification(
    body: BroadcastIn,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """FCM token'ı olan tüm (aktif) kullanıcılara push bildirim gönderir."""
    q = select(User).where(User.fcm_token.isnot(None))
    if body.only_active:
        q = q.where(User.is_active == True)  # noqa: E712

    result = await db.execute(q)
    users = result.scalars().all()
    tokens = [u.fcm_token for u in users if u.fcm_token]

    if not tokens:
        return {"sent": 0, "message": "FCM token'ı olan kullanıcı yok."}

    # FCM multicast gönderimi
    sent = 0
    try:
        from app.services.fcm import send_raw_multicast
        sent = await send_raw_multicast(
            tokens=tokens,
            title=body.title,
            body=body.body,
        )
    except ImportError:
        logger.warning("FCM servisi bulunamadı, broadcast atlandı.")
    except Exception as e:
        logger.error("Broadcast FCM hatası: %s", e)
        raise HTTPException(
            status_code=500,
            detail=f"Bildirim gönderilemedi: {str(e)}",
        )

    logger.info(
        "Broadcast gönderildi: admin=%d hedeflenen=%d gönderilen=%d",
        admin.id,
        len(tokens),
        sent,
    )
    return {"sent": sent, "total_targets": len(tokens)}


# ─── System / Utility ────────────────────────────────────────────────────────

@router.post(
    "/make-admin",
    status_code=200,
    summary="E-posta ile kullanıcıyı admin yap",
)
async def make_admin_by_email(
    body: MakeAdminIn,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """E-posta ile kullanıcıyı admin yapar."""
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı.")

    user.is_admin = True
    await db.commit()
    logger.info(
        "Kullanıcı admin yapıldı: admin=%d target_email=%s",
        admin.id,
        body.email,
    )
    return {"ok": True, "message": f"{body.email} admin yapıldı."}


@router.post(
    "/revoke-admin",
    status_code=200,
    summary="E-posta ile kullanıcının admin yetkisini kaldır",
)
async def revoke_admin_by_email(
    body: MakeAdminIn,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """E-posta ile kullanıcının admin yetkisini kaldırır."""
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı.")

    # Kendi yetkisini kaldırmayı engelle
    if user.id == admin.id:
        raise HTTPException(
            status_code=400,
            detail="Kendi admin yetkini kaldıramazsın.",
        )

    user.is_admin = False
    await db.commit()
    logger.info(
        "Admin yetkisi kaldırıldı: admin=%d target_email=%s",
        admin.id,
        body.email,
    )
    return {"ok": True, "message": f"{body.email} kullanıcısının admin yetkisi kaldırıldı."}


@router.get(
    "/system/health",
    summary="Sistem sağlık durumu",
)
async def system_health(
    _: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Veritabanı ve Redis bağlantı durumunu kontrol eder."""
    health = {
        "database": "unknown",
        "redis": "unknown",
        "timestamp": datetime.now(tz=timezone.utc).isoformat(),
    }

    # Veritabanı kontrolü
    try:
        await db.execute(text("SELECT 1"))
        health["database"] = "ok"
    except Exception as e:
        health["database"] = f"error: {str(e)}"

    # Redis kontrolü
    try:
        from app.core.redis import get_redis
        redis = await get_redis()
        await redis.ping()
        health["redis"] = "ok"
    except Exception as e:
        health["redis"] = f"error: {str(e)}"

    return health


@router.delete(
    "/seismic-reports/old",
    status_code=200,
    summary="Eski sismik raporları temizle",
)
async def cleanup_old_seismic_reports(
    days: int = Query(30, ge=1, le=365, description="Kaç günden eski raporlar silinsin"),
    _: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Belirtilen günden eski sismik raporları siler."""
    cutoff = datetime.now(tz=timezone.utc) - timedelta(days=days)
    result = await db.execute(
        delete(SeismicReport).where(SeismicReport.reported_at < cutoff)
    )
    await db.commit()
    deleted_count = result.rowcount
    logger.info("Eski sismik raporlar temizlendi: %d kayıt silindi", deleted_count)
    return {
        "deleted": deleted_count,
        "cutoff_date": cutoff.isoformat(),
        "message": f"{deleted_count} eski sismik rapor silindi.",
    }