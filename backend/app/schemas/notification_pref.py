"""
Bildirim tercihi şemaları.
"""

from pydantic import BaseModel, Field


class NotificationPrefIn(BaseModel):
    """Bildirim tercihi güncelleme girdisi."""

    min_magnitude: float = Field(default=3.0, ge=0.0, le=10.0, description="Minimum deprem büyüklüğü")
    radius_km: float = Field(default=500.0, ge=1.0, le=20000.0, description="Bildirim yarıçapı (km)")
    is_enabled: bool = Field(default=True, description="Bildirimler aktif mi?")


class NotificationPrefOut(BaseModel):
    """Bildirim tercihi yanıt şeması."""

    min_magnitude: float
    radius_km: float
    is_enabled: bool

    model_config = {"from_attributes": True}
