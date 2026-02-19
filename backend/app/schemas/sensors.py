"""
Sensör (shake) endpoint'i için istek/yanıt şemaları.
EARTHQUAKE_DETECTION_ALGORITHM.md ile uyumlu payload.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class ShakeReportRequest(BaseModel):
    """Mobil cihazdan gelen sarsıntı sinyali."""

    device_id: str = Field(..., min_length=1, max_length=256, description="Cihaz veya anonim ID")
    latitude: Optional[float] = Field(None, ge=-90, le=90)
    longitude: Optional[float] = Field(None, ge=-180, le=180)
    timestamp: datetime = Field(..., description="Sinyal zamanı (ISO 8601)")
    intensity: Optional[float] = Field(None, ge=0, description="Filtrelenmiş ivme büyüklüğü (m/s²)")


class ShakeReportResponse(BaseModel):
    """Shake endpoint yanıtı."""

    ok: bool = True
    message: str = "received"
    confirmed: bool = Field(False, description="Bu sinyalle deprem doğrulandı mı")
