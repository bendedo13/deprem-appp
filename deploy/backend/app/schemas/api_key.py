from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class APIKeyCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    company_name: Optional[str] = None
    user_id: str
    rate_limit_per_hour: int = Field(default=1000, ge=1, le=100000)
    rate_limit_per_day: int = Field(default=10000, ge=1, le=1000000)
    expires_at: Optional[datetime] = None


class APIKeyResponse(BaseModel):
    id: str
    key_prefix: str
    name: str
    company_name: Optional[str]
    user_id: str
    rate_limit_per_hour: int
    rate_limit_per_day: int
    is_active: bool
    total_requests: int
    monthly_requests: int
    last_used_at: Optional[datetime]
    expires_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


class APIKeyCreateResponse(APIKeyResponse):
    raw_key: str


class APIKeyUpdate(BaseModel):
    name: Optional[str] = None
    company_name: Optional[str] = None
    rate_limit_per_hour: Optional[int] = Field(None, ge=1, le=100000)
    rate_limit_per_day: Optional[int] = Field(None, ge=1, le=1000000)
    is_active: Optional[bool] = None
    expires_at: Optional[datetime] = None


class APIKeyStats(BaseModel):
    api_key_id: str
    name: str
    company_name: Optional[str]
    total_requests: int
    monthly_requests: int
    daily_requests: int
    last_used_at: Optional[datetime]
    rate_limit_per_hour: int
    rate_limit_per_day: int
    is_active: bool

    class Config:
        from_attributes = True


class APIUsageSummary(BaseModel):
    total_active_keys: int
    total_requests_today: int
    total_requests_this_month: int
    top_consumers: List[APIKeyStats]