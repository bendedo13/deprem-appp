"""
Deprem Pydantic şemaları — API request/response validasyonu.
"""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field, field_validator


class EarthquakeOut(BaseModel):
    """API response şeması — istemciye gönderilen deprem verisi."""

    id: str
    source: str
    magnitude: float
    depth: float
    latitude: float
    longitude: float
    location: str
    magnitude_type: str
    occurred_at: datetime

    model_config = {"from_attributes": True}


class EarthquakeListOut(BaseModel):
    """Sayfalanmış deprem listesi response şeması."""

    items: List[EarthquakeOut]
    total: int
    page: int
    page_size: int


class EarthquakeFilterParams(BaseModel):
    """Deprem listesi query parametreleri."""

    min_magnitude: float = Field(default=0.0, ge=0.0, le=10.0)
    max_magnitude: float = Field(default=10.0, ge=0.0, le=10.0)
    hours: int = Field(default=24, ge=1, le=720)  # max 30 gün
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=50, ge=1, le=200)

    @field_validator("max_magnitude")
    @classmethod
    def max_gte_min(cls, v: float, info) -> float:
        """max_magnitude, min_magnitude'den büyük veya eşit olmalı."""
        min_mag = info.data.get("min_magnitude", 0.0)
        if v < min_mag:
            raise ValueError("max_magnitude, min_magnitude'den küçük olamaz")
        return v
