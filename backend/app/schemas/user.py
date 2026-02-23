"""
Kullanıcı Pydantic şemaları — API request/response validasyonu.
"""

from datetime import datetime
from typing import Optional, List

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


class ProfileUpdate(BaseModel):
    """Kullanıcı profili güncelleme."""
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    phone: Optional[str] = Field(None, min_length=10, max_length=20)
    avatar: Optional[str] = Field(None, description="Emoji avatar")
    email: Optional[EmailStr] = None


class PasswordChange(BaseModel):
    """Şifre değiştirme."""
    current_password: str
    new_password: str = Field(min_length=8, max_length=128)


class ImSafeRequest(BaseModel):
    """Ben İyiyim mesajı isteği."""
    include_location: bool = True
    custom_message: Optional[str] = Field(None, max_length=255)
    contact_ids: Optional[List[int]] = Field(None, description="Belirli kişilere gönder (boşsa hepsine)")


# ── Response Şemaları ──────────────────────────────────────────────────────────

class UserOut(BaseModel):
    """Kullanıcı profil response — şifre hash'i asla dönmez."""
    id: int
    email: str
    name: Optional[str] = None
    phone: Optional[str] = None
    avatar: Optional[str] = None
    plan: str = "free"
    join_date: datetime
    is_active: bool
    is_admin: bool = False
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
