"""
Sismik cluster servisi — coğrafi ve zamansal kümeleme.
Yakın zamanda ve yakın konumda gelen raporları gruplayarak
olası depremi tespit eder.
rules.md: max 50 satır/fonksiyon, type hints, logging.
"""

import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.seismic_report import SeismicReport

logger = logging.getLogger(__name__)

# Sabitler — rules.md: magic number yasak
_RADIUS_DEG: float = 50.0 / 111.0   # ~50 km → derece cinsinden
_TIME_WINDOW_SEC: int = 60
_MIN_CLUSTER_SIZE: int = 3


async def find_nearby_cluster_id(
    latitude: float,
    longitude: float,
    reported_at: datetime,
    db: AsyncSession,
) -> Optional[int]:
    """
    Son 60 saniye içinde 50 km yarıçapındaki mevcut cluster'ı döner.
    Yoksa None döner.
    """
    since = reported_at - timedelta(seconds=_TIME_WINDOW_SEC)
    result = await db.execute(
        select(SeismicReport.cluster_id)
        .where(
            SeismicReport.reported_at >= since,
            SeismicReport.cluster_id.is_not(None),
            SeismicReport.latitude.between(latitude - _RADIUS_DEG, latitude + _RADIUS_DEG),
            SeismicReport.longitude.between(longitude - _RADIUS_DEG, longitude + _RADIUS_DEG),
        )
        .limit(1)
    )
    row = result.scalar_one_or_none()
    return int(row) if row is not None else None


async def get_next_cluster_id(db: AsyncSession) -> int:
    """Yeni cluster için max+1 ID üretir."""
    result = await db.execute(
        select(func.max(SeismicReport.cluster_id))
    )
    current_max = result.scalar_one_or_none()
    return (int(current_max) + 1) if current_max is not None else 1


async def get_cluster_size(cluster_id: int, db: AsyncSession) -> int:
    """Bir cluster'daki benzersiz cihaz sayısını döner."""
    result = await db.execute(
        select(func.count(SeismicReport.id)).where(
            SeismicReport.cluster_id == cluster_id
        )
    )
    count = result.scalar_one_or_none()
    return int(count) if count else 0


def is_likely_earthquake(cluster_size: int) -> bool:
    """Cluster yeterince büyükse deprem olarak işaretler."""
    return cluster_size >= _MIN_CLUSTER_SIZE
