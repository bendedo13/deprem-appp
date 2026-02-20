"""
Risk skoru hesaplama endpoint'i.
Konum tabanlı: son 30 günün deprem verilerini analiz eder, 0-100 arası risk skoru döner.
rules.md: async, type hints, Redis cache, logging.
"""

import logging
from datetime import datetime, timedelta, timezone
from typing import Any, List, Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.earthquake import Earthquake

logger = logging.getLogger(__name__)
router = APIRouter()

# Risk hesaplama sabitleri
_LOOKBACK_DAYS = 30
_HIGH_RISK_RADIUS_KM = 50.0
_MED_RISK_RADIUS_KM = 150.0
_LOW_RISK_RADIUS_KM = 300.0

# Büyüklük ağırlıkları (risk katkısı)
_MAG_WEIGHTS = {
    7.0: 40,
    6.0: 20,
    5.0: 10,
    4.0: 5,
    3.0: 1,
    0.0: 0,
}


class RiskScoreIn(BaseModel):
    """Risk skoru hesaplama girdisi."""

    latitude: float = Field(..., ge=-90.0, le=90.0, description="Enlem")
    longitude: float = Field(..., ge=-180.0, le=180.0, description="Boylam")


class RiskScoreOut(BaseModel):
    """Risk skoru yanıt şeması."""

    score: int = Field(description="Risk skoru 0-100 arası")
    level: str = Field(description="Düşük / Orta / Yüksek / Çok Yüksek")
    earthquake_count_30d: int = Field(description="30 günlük deprem sayısı (yakın çevrede)")
    max_magnitude_30d: Optional[float] = Field(description="30 günlük max büyüklük")
    radius_km: float = Field(description="Analiz yarıçapı (km)")


def _approx_km_to_deg(km: float) -> float:
    """
    Yaklaşık km → derece dönüşümü (Türkiye enlemi için ~111 km/derece).
    Gerçek hesaplamada geopy kullanılır; burada hız için approximation.
    """
    return km / 111.0


def _calc_score(quakes: List[Any]) -> int:
    """Deprem listesinden 0-100 arası risk skoru hesaplar."""
    total: int = 0
    for quake in quakes:
        mag: float = float(quake.magnitude or 0.0)
        # Büyüklük kademesine göre ağırlık bul
        weight: int = 0
        for threshold, w in sorted(_MAG_WEIGHTS.items(), reverse=True):
            if mag >= threshold:
                weight = int(w)
                break
        total = total + weight
    return min(total, 100)


def _score_to_level(score: int) -> str:
    """Risk skorunu kategoriye çevirir."""
    if score < 20:
        return "Düşük"
    if score < 50:
        return "Orta"
    if score < 75:
        return "Yüksek"
    return "Çok Yüksek"


@router.post("/score", response_model=RiskScoreOut, summary="Konum bazlı risk skoru hesapla")
async def score(body: RiskScoreIn, db: AsyncSession = Depends(get_db)) -> RiskScoreOut:
    """
    Verilen koordinat için son 30 günlük deprem geçmişine göre risk skoru döner.
    300 km yarıçap içindeki depremler değerlendirilir.
    """
    since = datetime.now(tz=timezone.utc) - timedelta(days=_LOOKBACK_DAYS)
    radius_deg = _approx_km_to_deg(_LOW_RISK_RADIUS_KM)

    result = await db.execute(
        select(Earthquake).where(
            Earthquake.occurred_at >= since,
            Earthquake.latitude.between(body.latitude - radius_deg, body.latitude + radius_deg),
            Earthquake.longitude.between(body.longitude - radius_deg, body.longitude + radius_deg),
        )
    )
    quakes = result.scalars().all()

    score_val = _calc_score(list(quakes))
    max_mag = max((q.magnitude for q in quakes), default=None)

    logger.info(
        "Risk skoru hesaplandı: lat=%.4f lng=%.4f score=%d count=%d",
        body.latitude, body.longitude, score_val, len(quakes),
    )

    return RiskScoreOut(
        score=score_val,
        level=_score_to_level(score_val),
        earthquake_count_30d=len(quakes),
        max_magnitude_30d=max_mag,
        radius_km=_LOW_RISK_RADIUS_KM,
    )
