"""
Kullanıcı dashboard API endpoint'leri.
Analiz özeti, abonelik bilgisi, aktivite geçmişi ve istatistikler.
"""

import logging
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.models.earthquake import Earthquake
from app.models.notification_pref import NotificationPref
from app.models.emergency_contact import EmergencyContact
from app.api.v1.users import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()


# ─── Şemalar ─────────────────────────────────────────────────────────────────

class SubscriptionInfo(BaseModel):
    """Abonelik bilgisi."""
    plan: str
    plan_display: str
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    is_active: bool
    days_remaining: Optional[int] = None
    features: List[str]
    price_monthly: Optional[float] = None


class ActivitySummary(BaseModel):
    """Aktivite özeti."""
    total_alerts_received: int
    alerts_last_7_days: int
    alerts_last_30_days: int
    last_alert_at: Optional[datetime] = None
    nearby_earthquakes_count: int
    max_magnitude_seen: Optional[float] = None


class EarthquakeStats(BaseModel):
    """Deprem istatistikleri."""
    total_in_region: int
    last_24h: int
    last_7_days: int
    last_30_days: int
    avg_magnitude: Optional[float] = None
    max_magnitude: Optional[float] = None
    nearest_distance_km: Optional[float] = None


class NotificationStats(BaseModel):
    """Bildirim istatistikleri."""
    push_enabled: bool
    sms_enabled: bool
    email_enabled: bool
    quiet_hours_enabled: bool
    min_magnitude: float
    locations_count: int
    weekly_summary: bool
    aftershock_alerts: bool


class PaymentRecord(BaseModel):
    """Ödeme kaydı."""
    id: str
    date: datetime
    amount: float
    currency: str
    plan: str
    status: str
    description: str


class DashboardSummary(BaseModel):
    """Dashboard ana özet."""
    user_id: int
    user_name: Optional[str]
    user_email: str
    user_avatar: Optional[str]
    subscription: SubscriptionInfo
    activity: ActivitySummary
    earthquake_stats: EarthquakeStats
    notification_stats: NotificationStats
    emergency_contacts_count: int
    profile_completion: int  # 0-100 arası yüzde
    member_since_days: int


class RecentEarthquakeItem(BaseModel):
    """Son deprem özeti."""
    id: str
    magnitude: float
    location: str
    occurred_at: datetime
    depth: float
    distance_km: Optional[float] = None
    is_nearby: bool = False


class DashboardRecentActivity(BaseModel):
    """Son aktiviteler."""
    recent_earthquakes: List[RecentEarthquakeItem]
    period_days: int


# ─── Yardımcı Fonksiyonlar ────────────────────────────────────────────────────

def _get_plan_info(plan: str, join_date: datetime) -> SubscriptionInfo:
    """Plan bilgisini döndürür."""
    now = datetime.now(tz=timezone.utc)

    plan_configs = {
        "free": {
            "display": "Ücretsiz Plan",
            "features": [
                "Temel deprem bildirimleri",
                "Son 24 saat verisi",
                "1 konum takibi",
                "Push bildirim",
            ],
            "price": None,
        },
        "premium": {
            "display": "Premium Plan",
            "features": [
                "Anlık deprem bildirimleri",
                "90 günlük geçmiş veri",
                "5 konum takibi",
                "Push + SMS + E-posta bildirimi",
                "Artçı deprem uyarıları",
                "Haftalık analiz raporu",
                "Risk skoru hesaplama",
                "PDF rapor indirme",
            ],
            "price": 29.99,
        },
        "enterprise": {
            "display": "Kurumsal Plan",
            "features": [
                "Tüm Premium özellikler",
                "Sınırsız konum takibi",
                "API erişimi",
                "Özel bildirim kuralları",
                "Öncelikli destek",
                "Özel raporlama",
            ],
            "price": 99.99,
        },
    }

    config = plan_configs.get(plan, plan_configs["free"])

    # Premium/Enterprise için bitiş tarihi hesapla (join_date + 30 gün örnek)
    end_date = None
    days_remaining = None
    if plan != "free":
        # Gerçek uygulamada ödeme tablosundan gelir
        end_date = join_date + timedelta(days=30)
        if end_date.tzinfo is None:
            end_date = end_date.replace(tzinfo=timezone.utc)
        days_remaining = max(0, (end_date - now).days)

    return SubscriptionInfo(
        plan=plan,
        plan_display=config["display"],
        start_date=join_date,
        end_date=end_date,
        is_active=True,
        days_remaining=days_remaining,
        features=config["features"],
        price_monthly=config.get("price"),
    )


def _calculate_profile_completion(user: User, contacts_count: int, has_prefs: bool) -> int:
    """Profil tamamlanma yüzdesini hesaplar."""
    score = 0
    checks = [
        (bool(user.email), 20),
        (bool(user.name), 20),
        (bool(user.phone), 15),
        (bool(user.avatar), 10),
        (bool(user.latitude and user.longitude), 15),
        (contacts_count > 0, 10),
        (has_prefs, 10),
    ]
    for condition, points in checks:
        if condition:
            score += points
    return min(100, score)


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """İki koordinat arası mesafeyi km cinsinden hesaplar."""
    import math
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    return R * 2 * math.asin(math.sqrt(a))


# ─── Endpoint'ler ─────────────────────────────────────────────────────────────

@router.get(
    "/summary",
    response_model=DashboardSummary,
    summary="Dashboard ana özeti",
)
async def get_dashboard_summary(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DashboardSummary:
    """
    Kullanıcı dashboard'u için kapsamlı özet döner.
    Abonelik, aktivite, deprem istatistikleri ve profil bilgilerini içerir.
    """
    now = datetime.now(tz=timezone.utc)

    # Acil kişi sayısı
    contacts_result = await db.execute(
        select(func.count(EmergencyContact.id)).where(
            EmergencyContact.user_id == current_user.id
        )
    )
    contacts_count = contacts_result.scalar_one()

    # Bildirim tercihleri
    pref_result = await db.execute(
        select(NotificationPref).where(NotificationPref.user_id == current_user.id)
    )
    pref = pref_result.scalar_one_or_none()

    # Deprem istatistikleri (kullanıcı konumuna göre)
    eq_stats = await _get_earthquake_stats(current_user, db, now)

    # Aktivite özeti
    activity = ActivitySummary(
        total_alerts_received=eq_stats.total_in_region,
        alerts_last_7_days=eq_stats.last_7_days,
        alerts_last_30_days=eq_stats.last_30_days,
        last_alert_at=None,
        nearby_earthquakes_count=eq_stats.last_24h,
        max_magnitude_seen=eq_stats.max_magnitude,
    )

    # Bildirim istatistikleri
    notif_stats = NotificationStats(
        push_enabled=pref.push_enabled if pref else True,
        sms_enabled=pref.sms_enabled if pref else False,
        email_enabled=pref.email_enabled if pref else False,
        quiet_hours_enabled=pref.quiet_hours_enabled if pref else False,
        min_magnitude=pref.min_magnitude if pref else 3.0,
        locations_count=len(pref.locations) if pref and pref.locations else 0,
        weekly_summary=pref.weekly_summary if pref else False,
        aftershock_alerts=pref.aftershock_alerts if pref else False,
    )

    # Üyelik süresi
    join_date = current_user.join_date
    if join_date.tzinfo is None:
        join_date = join_date.replace(tzinfo=timezone.utc)
    member_since_days = (now - join_date).days

    # Profil tamamlanma
    profile_completion = _calculate_profile_completion(
        current_user, contacts_count, pref is not None
    )

    return DashboardSummary(
        user_id=current_user.id,
        user_name=current_user.name,
        user_email=current_user.email,
        user_avatar=current_user.avatar,
        subscription=_get_plan_info(current_user.plan, join_date),
        activity=activity,
        earthquake_stats=eq_stats,
        notification_stats=notif_stats,
        emergency_contacts_count=contacts_count,
        profile_completion=profile_completion,
        member_since_days=member_since_days,
    )


async def _get_earthquake_stats(
    user: User, db: AsyncSession, now: datetime
) -> EarthquakeStats:
    """Kullanıcı konumuna göre deprem istatistiklerini hesaplar."""
    # Tüm zamanlar için toplam
    total_result = await db.execute(select(func.count(Earthquake.id)))
    total = total_result.scalar_one()

    # Son 24 saat
    last_24h_result = await db.execute(
        select(func.count(Earthquake.id)).where(
            Earthquake.occurred_at >= now - timedelta(hours=24)
        )
    )
    last_24h = last_24h_result.scalar_one()

    # Son 7 gün
    last_7d_result = await db.execute(
        select(func.count(Earthquake.id)).where(
            Earthquake.occurred_at >= now - timedelta(days=7)
        )
    )
    last_7d = last_7d_result.scalar_one()

    # Son 30 gün + istatistikler
    agg_result = await db.execute(
        select(
            func.count(Earthquake.id).label("cnt"),
            func.avg(Earthquake.magnitude).label("avg_mag"),
            func.max(Earthquake.magnitude).label("max_mag"),
        ).where(Earthquake.occurred_at >= now - timedelta(days=30))
    )
    agg = agg_result.one()

    return EarthquakeStats(
        total_in_region=total,
        last_24h=last_24h,
        last_7_days=last_7d,
        last_30_days=agg.cnt or 0,
        avg_magnitude=round(agg.avg_mag, 2) if agg.avg_mag else None,
        max_magnitude=agg.max_mag,
        nearest_distance_km=None,
    )


@router.get(
    "/recent-earthquakes",
    response_model=DashboardRecentActivity,
    summary="Son depremler (dashboard için)",
)
async def get_recent_earthquakes(
    days: int = Query(default=7, ge=1, le=30),
    limit: int = Query(default=10, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DashboardRecentActivity:
    """
    Dashboard için son depremleri döner.
    Kullanıcı konumu varsa mesafe hesaplanır.
    """
    since = datetime.now(tz=timezone.utc) - timedelta(days=days)

    result = await db.execute(
        select(Earthquake)
        .where(Earthquake.occurred_at >= since)
        .order_by(Earthquake.occurred_at.desc())
        .limit(limit)
    )
    earthquakes = result.scalars().all()

    items = []
    for eq in earthquakes:
        distance_km = None
        is_nearby = False

        # Kullanıcı konumu varsa mesafe hesapla
        if current_user.latitude and current_user.longitude:
            distance_km = round(
                _haversine_km(
                    current_user.latitude, current_user.longitude,
                    eq.latitude, eq.longitude
                ),
                1,
            )
            is_nearby = distance_km <= 200  # 200 km içi "yakın" sayılır

        items.append(
            RecentEarthquakeItem(
                id=eq.id,
                magnitude=eq.magnitude,
                location=eq.location,
                occurred_at=eq.occurred_at,
                depth=eq.depth,
                distance_km=distance_km,
                is_nearby=is_nearby,
            )
        )

    return DashboardRecentActivity(recent_earthquakes=items, period_days=days)


@router.get(
    "/payments",
    response_model=List[PaymentRecord],
    summary="Ödeme geçmişi",
)
async def get_payment_history(
    current_user: User = Depends(get_current_user),
) -> List[PaymentRecord]:
    """
    Kullanıcının ödeme geçmişini döner.
    Gerçek uygulamada ödeme sağlayıcısından (Stripe/İyzico) çekilir.
    """
    # Demo veri — gerçek uygulamada ödeme tablosundan gelir
    if current_user.plan == "free":
        return []

    now = datetime.now(tz=timezone.utc)
    demo_payments = [
        PaymentRecord(
            id=f"PAY-{current_user.id}-001",
            date=now - timedelta(days=0),
            amount=29.99,
            currency="TRY",
            plan="Premium",
            status="completed",
            description="Premium Plan - Aylık Abonelik",
        ),
        PaymentRecord(
            id=f"PAY-{current_user.id}-002",
            date=now - timedelta(days=30),
            amount=29.99,
            currency="TRY",
            plan="Premium",
            status="completed",
            description="Premium Plan - Aylık Abonelik",
        ),
        PaymentRecord(
            id=f"PAY-{current_user.id}-003",
            date=now - timedelta(days=60),
            amount=29.99,
            currency="TRY",
            plan="Premium",
            status="completed",
            description="Premium Plan - Aylık Abonelik",
        ),
    ]
    return demo_payments


@router.get(
    "/analytics",
    summary="Kişisel analiz özeti",
)
async def get_personal_analytics(
    days: int = Query(default=30, ge=7, le=90),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Kullanıcıya özel deprem analiz özeti.
    Bölgesel istatistikler ve trend analizi.
    """
    now = datetime.now(tz=timezone.utc)
    since = now - timedelta(days=days)

    # Günlük deprem sayıları
    daily_result = await db.execute(
        select(
            func.date_trunc("day", Earthquake.occurred_at).label("day"),
            func.count(Earthquake.id).label("cnt"),
            func.max(Earthquake.magnitude).label("max_mag"),
        )
        .where(Earthquake.occurred_at >= since)
        .group_by("day")
        .order_by("day")
    )
    daily_data = [
        {
            "date": row.day.strftime("%Y-%m-%d") if hasattr(row.day, "strftime") else str(row.day)[:10],
            "count": int(row.cnt),
            "max_magnitude": float(row.max_mag) if row.max_mag else 0.0,
        }
        for row in daily_result.all()
    ]

    # Büyüklük dağılımı
    from sqlalchemy import case
    mag_result = await db.execute(
        select(
            case(
                (Earthquake.magnitude < 3.0, "< 3.0"),
                (Earthquake.magnitude < 4.0, "3.0-3.9"),
                (Earthquake.magnitude < 5.0, "4.0-4.9"),
                (Earthquake.magnitude < 6.0, "5.0-5.9"),
                else_="≥ 6.0",
            ).label("range"),
            func.count(Earthquake.id).label("cnt"),
        )
        .where(Earthquake.occurred_at >= since)
        .group_by("range")
    )
    magnitude_dist = [
        {"range": row.range, "count": int(row.cnt)}
        for row in mag_result.all()
    ]

    # Genel istatistikler
    agg_result = await db.execute(
        select(
            func.count(Earthquake.id).label("total"),
            func.avg(Earthquake.magnitude).label("avg_mag"),
            func.max(Earthquake.magnitude).label("max_mag"),
            func.min(Earthquake.magnitude).label("min_mag"),
        ).where(Earthquake.occurred_at >= since)
    )
    agg = agg_result.one()

    return {
        "period_days": days,
        "total_earthquakes": agg.total or 0,
        "avg_magnitude": round(agg.avg_mag, 2) if agg.avg_mag else None,
        "max_magnitude": agg.max_mag,
        "min_magnitude": agg.min_mag,
        "daily_data": daily_data,
        "magnitude_distribution": magnitude_dist,
        "user_location": {
            "latitude": current_user.latitude,
            "longitude": current_user.longitude,
        },
    }