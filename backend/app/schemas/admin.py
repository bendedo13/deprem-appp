"""
Admin paneli için ek Pydantic şemaları.
API response/request modelleri.
"""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class AdminDashboardStats(BaseModel):
    """Admin dashboard özet istatistikleri."""
    total_users: int
    active_users: int
    admin_users: int
    premium_users: int
    total_earthquakes: int
    earthquakes_last_24h: int
    earthquakes_last_7d: int
    seismic_reports_total: int
    sos_records_total: int
    sos_records_last_24h: int
    users_with_fcm: int
    users_with_location: int


class AdminActivityLog(BaseModel):
    """Admin aktivite logu."""
    timestamp: datetime
    admin_id: int
    action: str
    target_type: str
    target_id: str
    details: Optional[str] = None


class AdminBulkActionResult(BaseModel):
    """Toplu işlem sonucu."""
    success_count: int
    error_count: int
    errors: List[str] = Field(default_factory=list)
    message: str