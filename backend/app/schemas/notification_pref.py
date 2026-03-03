"""
Bildirim tercihi Pydantic şemaları.
"""

from datetime import time
from typing import List, Optional

from pydantic import BaseModel, Field


class NotificationPrefIn(BaseModel):
    """Bildirim tercihi güncelleme isteği."""
    min_magnitude: float = Field(default=3.0, ge=0.0, le=10.0)
    radius_km: float = Field(default=500.0, ge=0.0, le=20000.0)
    is_enabled: bool = True
    locations: List[str] = Field(default_factory=list)
    push_enabled: bool = True
    sms_enabled: bool = False
    email_enabled: bool = False
    quiet_hours_enabled: bool = False
    quiet_start: Optional[time] = None
    quiet_end: Optional[time] = None
    weekly_summary: bool = False
    aftershock_alerts: bool = False


class NotificationPrefOut(BaseModel):
    """Bildirim tercihi yanıtı."""
    id: int
    user_id: int
    min_magnitude: float
    radius_km: float
    is_enabled: bool
    locations: List[str] = Field(default_factory=list)
    push_enabled: bool
    sms_enabled: bool
    email_enabled: bool
    quiet_hours_enabled: bool
    quiet_start: Optional[time] = None
    quiet_end: Optional[time] = None
    weekly_summary: bool
    aftershock_alerts: bool

    model_config = {"from_attributes": True}