from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
import uuid


class AdminLoginRequest(BaseModel):
    email: EmailStr
    password: str


class AdminLoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    admin_id: str
    email: str
    full_name: Optional[str]
    is_superadmin: bool


class AdminMeResponse(BaseModel):
    id: str
    email: str
    full_name: Optional[str]
    is_active: bool
    is_superadmin: bool
    created_at: datetime
    last_login: Optional[datetime]


class EarthquakeSchema(BaseModel):
    id: str
    event_id: str
    magnitude: float
    depth: Optional[float]
    latitude: float
    longitude: float
    location: Optional[str]
    occurred_at: datetime
    source: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class NotificationSchema(BaseModel):
    id: str
    title: str
    body: str
    earthquake_id: Optional[str]
    sent_at: datetime
    recipient_count: int

    class Config:
        from_attributes = True