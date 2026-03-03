"""
Kullanıcı Pydantic şemaları.
Request/Response modelleri — ORM modellerinden ayrı tutulur.
"""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, EmailStr, Field


class UserRegisterIn(BaseModel):
    """Kullanıcı kayıt isteği."""
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class UserLoginIn(BaseModel):
    """Kullanıcı giriş isteği."""
    email: EmailStr
    password: str


class UserUpdateIn(BaseModel):
    """Teknik güncelleme (FCM token, konum)."""
    fcm_token: Optional[str] = Field(None, max_length=512)
    latitude: Optional[float] = Field(None, ge=-90.0, le=90.0)
    longitude: Optional[float] = Field(None, ge=-180.0, le=180.0)


class ProfileUpdate(BaseModel):
    """Profil bilgisi güncelleme."""
    name: Optional[str] = Field(None, max_length=100)
    phone: Optional[str] = Field(None, max_length=20)
    avatar: Optional[str] = Field(None, max_length=10)
    email: Optional[EmailStr] = None


class PasswordChange(BaseModel):
    """Şifre değiştirme isteği."""
    current_password: str
    new_password: str = Field(min_length=8, max_length=128)


class ImSafeRequest(BaseModel):
    """Ben İyiyim isteği."""
    contact_ids: Optional[List[int]] = None
    custom_message: Optional[str] = Field(None, max_length=500)
    include_location: bool = False
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class UserOut(BaseModel):
    """Kullanıcı profil yanıtı."""
    id: int
    email: str
    is_active: bool
    is_admin: bool
    name: Optional[str] = None
    phone: Optional[str] = None
    avatar: Optional[str] = None
    plan: str = "free"
    fcm_token: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    created_at: datetime
    join_date: Optional[datetime] = None

    model_config = {"from_attributes": True}


class TokenOut(BaseModel):
    """JWT token yanıtı."""
    access_token: str
    token_type: str = "bearer"
    user: UserOut