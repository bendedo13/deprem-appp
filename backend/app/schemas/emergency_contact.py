"""
Acil iletişim kişisi şemaları.
Pydantic v2 — rules.md: type hints, validation.
"""

from typing import Literal, Optional

from pydantic import BaseModel, EmailStr, field_validator


class EmergencyContactIn(BaseModel):
    """Yeni acil kişi oluşturma girdisi."""

    name: str
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    channel: Literal["push", "sms", "email"] = "push"

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        """İsim boş olamaz."""
        if not v.strip():
            raise ValueError("İsim boş olamaz.")
        return v.strip()

    @field_validator("phone")
    @classmethod
    def phone_format(cls, v: Optional[str]) -> Optional[str]:
        """Telefon numarası basit format kontrolü."""
        if v is not None:
            cleaned = v.strip()
            if cleaned and not cleaned.replace("+", "").replace(" ", "").isdigit():
                raise ValueError("Geçersiz telefon numarası.")
            return cleaned or None
        return v


class EmergencyContactOut(BaseModel):
    """Acil kişi yanıt şeması."""

    id: int
    name: str
    phone: Optional[str]
    email: Optional[str]
    channel: str

    model_config = {"from_attributes": True}
