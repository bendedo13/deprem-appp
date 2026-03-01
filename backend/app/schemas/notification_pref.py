"""
Bildirim tercihi şemaları.
"""

from datetime import time
from typing import List, Optional

from pydantic import BaseModel, Field


class NotificationPrefIn(BaseModel):
    """Bildirim tercihi güncelleme girdisi."""

    min_magnitude: float = Field(default=3.0, ge=0.0, le=10.0, description="Minimum deprem büyüklüğü")
    locations: List[str] = Field(default_factory=list, description="Takip edilen konumlar")
    push_enabled: bool = Field(default=True, description="Push bildirimleri aktif mi?")
    sms_enabled: bool = Field(default=False, description="SMS bildirimleri aktif mi?")
    email_enabled: bool = Field(default=False, description="E-posta bildirimleri aktif mi?")
    quiet_hours_enabled: bool = Field(default=False, description="Sessiz saatler aktif mi?")
    quiet_start: Optional[time] = Field(default=None, description="Sessiz saat başlangıç")
    quiet_end: Optional[time] = Field(default=None, description="Sessiz saat bitiş")
    weekly_summary: bool = Field(default=False, description="Haftalık özet gönderilsin mi?")
    aftershock_alerts: bool = Field(default=False, description="Artçı depremler bildirilsin mi?")


class NotificationPrefOut(BaseModel):
    """Bildirim tercihi yanıt şeması."""

    min_magnitude: float
    locations: List[str]
    push_enabled: bool
    sms_enabled: bool
    email_enabled: bool
    quiet_hours_enabled: bool
    quiet_start: Optional[time] = None
    quiet_end: Optional[time] = None
    weekly_summary: bool
    aftershock_alerts: bool

    model_config = {"from_attributes": True}