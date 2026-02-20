"""
Deprem listesi ve detay API endpoint'leri.
rules.md: Redis cache (30s TTL), pagination, type hints, async, logging.
"""

import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timedelta, timezone

from app.database import get_db
from app.core.redis import get_redis
from app.models.earthquake import Earthquake
from app.schemas.earthquake import EarthquakeOut, EarthquakeListOut, EarthquakeFilterParams
from app.services.cache_manager import get_earthquake_cache, set_earthquake_cache

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get(
    "",
    response_model=EarthquakeListOut,
    summary="Son depremleri listele",
    description="Filtreleme ve sayfalama destekli deprem listesi. Sonuçlar 30s Redis cache'e alınır.",
)
async def list_earthquakes(
    min_magnitude: float = Query(default=0.0, ge=0.0, le=10.0, description="Minimum büyüklük"),
    max_magnitude: float = Query(default=10.0, ge=0.0, le=10.0, description="Maksimum büyüklük"),
    hours: int = Query(default=24, ge=1, le=720, description="Son kaç saatlik veri (max 30 gün)"),
    page: int = Query(default=1, ge=1, description="Sayfa numarası"),
    page_size: int = Query(default=50, ge=1, le=200, description="Sayfa başına kayıt"),
    db: AsyncSession = Depends(get_db),
) -> EarthquakeListOut:
    """
    Depremleri filtreler, sayfalayarak döndürür.
    Önce Redis'e bakar; cache miss ise DB'den okur ve cache'e yazar.
    """
    redis = await get_redis()

    # 1. Cache kontrolü
    cached = await get_earthquake_cache(redis, hours, min_magnitude, page, page_size)
    if cached:
        return EarthquakeListOut(**cached)

    # 2. DB sorgusu
    since = datetime.now(tz=timezone.utc) - timedelta(hours=hours)
    filters = [
        Earthquake.occurred_at >= since,
        Earthquake.magnitude >= min_magnitude,
        Earthquake.magnitude <= max_magnitude,
    ]

    total_stmt = select(func.count()).select_from(Earthquake).where(and_(*filters))
    total_result = await db.execute(total_stmt)
    total: int = total_result.scalar_one()

    offset = (page - 1) * page_size
    stmt = (
        select(Earthquake)
        .where(and_(*filters))
        .order_by(Earthquake.occurred_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    result = await db.execute(stmt)
    rows = result.scalars().all()

    items = [EarthquakeOut.model_validate(row) for row in rows]
    response = EarthquakeListOut(items=items, total=total, page=page, page_size=page_size)

    # 3. Cache'e yaz
    await set_earthquake_cache(
        redis, hours, min_magnitude, page, page_size, response.model_dump()
    )

    return response


@router.get(
    "/{earthquake_id}",
    response_model=EarthquakeOut,
    summary="Deprem detayı",
)
async def get_earthquake(
    earthquake_id: str,
    db: AsyncSession = Depends(get_db),
) -> EarthquakeOut:
    """
    Belirtilen ID'li depremin detayını döndürür.

    Args:
        earthquake_id: Deprem ID'si (örn: afad-2024001234)
    """
    row = await db.get(Earthquake, earthquake_id)
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Deprem bulunamadı: {earthquake_id}",
        )
    return EarthquakeOut.model_validate(row)
