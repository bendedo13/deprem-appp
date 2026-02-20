"""
Seismic Pydantic şemaları — request/response doğrulama.
rules.md: type hints zorunlu, `any` kullanma.
"""

from datetime import datetime
from pydantic import BaseModel, Field


class SeismicReportIn(BaseModel):
    """Cihazdan gelen titreşim raporu isteği."""

    device_id: str = Field(..., min_length=4, max_length=128, description="Benzersiz cihaz ID")
    peak_acceleration: float = Field(..., gt=0, description="Tepe ivme değeri (m/s²)")
    sta_lta_ratio: float = Field(..., gt=0, description="STA/LTA tetikleme oranı")
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)


class SeismicReportOut(BaseModel):
    """Rapor kabul yanıtı."""

    id: int
    device_id: str
    cluster_id: int | None
    cluster_size: int
    is_likely_earthquake: bool
    reported_at: datetime

    model_config = {"from_attributes": True}


class SeismicClusterOut(BaseModel):
    """Aktif sismik cluster özeti."""

    cluster_id: int
    report_count: int
    center_latitude: float
    center_longitude: float
    max_acceleration: float
    is_likely_earthquake: bool
    first_report_at: datetime
