"""
Kullanıcı Pydantic şemaları — API request/response validasyonu.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field


# ── Request Şemaları ───────────────────────────────────────────────────────────

class UserRegisterIn(BaseModel):
    """Kayıt isteği."""
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class UserLoginIn(BaseModel):
    """Giriş isteği."""
    email: EmailStr
    password: str


class UserUpdateIn(BaseModel):
    """Profil güncelleme (kısmi — sadece gönderilen alanlar güncellenir)."""
    fcm_token: Optional[str] = Field(default=None, max_length=512)
    latitude: Optional[float] = Field(default=None, ge=-90.0, le=90.0)
    longitude: Optional[float] = Field(default=None, ge=-180.0, le=180.0)


# ── Response Şemaları ──────────────────────────────────────────────────────────

class UserOut(BaseModel):
    """Kullanıcı profil response — şifre hash'i asla dönmez."""
    id: int
    email: str
    is_active: bool
    fcm_token: Optional[str]
    latitude: Optional[float]
    longitude: Optional[float]
    created_at: datetime

    model_config = {"from_attributes": True}


class TokenOut(BaseModel):
    """JWT token response."""
    access_token: str
    token_type: str = "bearer"
    user: UserOut
