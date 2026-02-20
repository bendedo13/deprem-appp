"""
Deprem istatistikleri endpoint'i.
Günlük sayılar, büyüklük dağılımı, en aktif bölgeler — DB'den canlı sorgu.
rules.md: async, type hints, Redis cache (cache_manager üzerinden), logging.
"""

import logging
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import select, func, case
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.earthquake import Earthquake

logger = logging.getLogger(__name__)
router = APIRouter()


# ─── Şemalar ─────────────────────────────────────────────────────────────────

class DailyCount(BaseModel):
    """Günlük deprem sayısı."""
    date: str
    count: int


class MagnitudeDistribution(BaseModel):
    """Büyüklük aralığına göre dağılım."""
    range: str
    count: int


class HotSpot(BaseModel):
    """En aktif bölge."""
    location: str
    count: int
    max_magnitude: float


class AnalyticsOut(BaseModel):
    """Analytics endpoint yanıtı."""
    period_days: int
    total_earthquakes: int
    avg_magnitude: Optional[float]
    max_magnitude: Optional[float]
    daily_counts: List[DailyCount]
    magnitude_distribution: List[MagnitudeDistribution]
    hotspots: List[HotSpot]


# ─── Endpoint ────────────────────────────────────────────────────────────────

@router.get("", response_model=AnalyticsOut, summary="Deprem istatistikleri")
async def analytics(
    days: int = Query(default=7, ge=1, le=90, description="Kaç günlük veri (1-90)"),
    db: AsyncSession = Depends(get_db),
) -> AnalyticsOut:
    """
    Son `days` günlük deprem istatistiklerini döner:
    - Günlük deprem sayıları
    - Büyüklük dağılımı (< 3, 3-4, 4-5, 5-6, ≥ 6)
    - En aktif 5 bölge
    """
    since = datetime.now(tz=timezone.utc) - timedelta(days=days)

    # ── Toplam / Ort / Max ───────────────────────────────────────────────────
    agg_result = await db.execute(
        select(
            func.count(Earthquake.id).label("total"),
            func.avg(Earthquake.magnitude).label("avg_mag"),
            func.max(Earthquake.magnitude).label("max_mag"),
        ).where(Earthquake.occurred_at >= since)
    )
    agg = agg_result.one()

    # ── Günlük sayılar ───────────────────────────────────────────────────────
    daily_result = await db.execute(
        select(
            func.date_trunc("day", Earthquake.occurred_at).label("day"),
            func.count(Earthquake.id).label("cnt"),
        )
        .where(Earthquake.occurred_at >= since)
        .group_by("day")
        .order_by("day")
    )
    daily_counts: List[DailyCount] = [
        DailyCount(
            date=row.day.strftime("%Y-%m-%d") if hasattr(row.day, "strftime") else str(row.day)[:10],
            count=int(row.cnt),
        )
        for row in daily_result.all()
    ]

    # ── Büyüklük dağılımı ───────────────────────────────────────────────────
    mag_result = await db.execute(
        select(
            case(
                (Earthquake.magnitude < 3.0, "< 3.0"),
                (Earthquake.magnitude < 4.0, "3.0-3.9"),
                (Earthquake.magnitude < 5.0, "4.0-4.9"),
                (Earthquake.magnitude < 6.0, "5.0-5.9"),
                else_="≥ 6.0",
            ).label("mag_range"),
            func.count(Earthquake.id).label("cnt"),
        )
        .where(Earthquake.occurred_at >= since)
        .group_by("mag_range")
        .order_by("mag_range")
    )
    distribution = [
        MagnitudeDistribution(range=row.mag_range, count=row.cnt)
        for row in mag_result.all()
    ]

    # ── Hotspot — en aktif 5 bölge ──────────────────────────────────────────
    hot_result = await db.execute(
        select(
            Earthquake.location,
            func.count(Earthquake.id).label("cnt"),
            func.max(Earthquake.magnitude).label("max_mag"),
        )
        .where(Earthquake.occurred_at >= since, Earthquake.location.isnot(None))
        .group_by(Earthquake.location)
        .order_by(func.count(Earthquake.id).desc())
        .limit(5)
    )
    hotspots = [
        HotSpot(location=row.location, count=row.cnt, max_magnitude=row.max_mag or 0.0)
        for row in hot_result.all()
    ]

    logger.info("Analytics sorgulandı: days=%d total=%d", days, agg.total or 0)

    return AnalyticsOut(
        period_days=days,
        total_earthquakes=agg.total or 0,
        avg_magnitude=round(agg.avg_mag, 2) if agg.avg_mag else None,
        max_magnitude=agg.max_mag,
        daily_counts=daily_counts,
        magnitude_distribution=distribution,
        hotspots=hotspots,
    )
