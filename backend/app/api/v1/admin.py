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
    id: int
    email: str
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


class AdminStats(BaseModel):
    total_users: int
    active_users: int
    admin_users: int
    total_earthquakes: int
    earthquakes_last_24h: int
    earthquakes_last_7d: int
    seismic_reports_total: int
    users_with_fcm: int
    users_with_location: int


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

    return AdminStats(
        total_users=total_users,
        active_users=active_users,
        admin_users=admin_users,
        total_earthquakes=total_eq,
        earthquakes_last_24h=eq_24h,
        earthquakes_last_7d=eq_7d,
        seismic_reports_total=seismic_total,
        users_with_fcm=users_with_fcm,
        users_with_location=users_with_location,
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
    """Kullanıcı is_active ve is_admin alanlarını günceller."""
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı.")
    if user.id == admin.id and body.is_admin is False:
        raise HTTPException(status_code=400, detail="Kendi admin yetkini kaldıramazsın.")
    if body.is_active is not None:
        user.is_active = body.is_active
    if body.is_admin is not None:
        user.is_admin = body.is_admin
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
    only_active: bool = True


@router.post("/broadcast", status_code=200, summary="Tüm kullanıcılara push bildirim gönder")
async def broadcast_notification(
    body: BroadcastIn,
    _: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """FCM token'ı olan tüm (aktif) kullanıcılara push bildirim gönderir."""
    from app.services.fcm import send_raw_multicast

    q = select(User).where(User.fcm_token.isnot(None))
    if body.only_active:
        q = q.where(User.is_active == True)
    result = await db.execute(q)
    users = result.scalars().all()
    tokens = [u.fcm_token for u in users if u.fcm_token]

    if not tokens:
        return {"sent": 0, "message": "FCM token'ı olan kullanıcı yok."}

    sent = await send_raw_multicast(tokens=tokens, title=body.title, body=body.body)
    logger.info("Broadcast gönderildi: admin hedeflenen=%d gönderilen=%d", len(tokens), sent)
    return {"sent": sent, "total_targets": len(tokens)}


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
