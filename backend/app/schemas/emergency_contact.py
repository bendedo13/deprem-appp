"""
Acil iletişim kişisi şemaları.
Pydantic v2 — rules.md: type hints, validation.
"""

from typing import List, Literal, Optional

from pydantic import BaseModel, EmailStr, Field, field_validator


class EmergencyContactIn(BaseModel):
    """Yeni acil kişi oluşturma girdisi."""

    name: str
    phone: str
    email: Optional[EmailStr] = None
    relation: str = Field(..., description="Yakınlık derecesi (Aile, Eş, Arkadaş vb.)")
    methods: List[Literal["whatsapp", "sms", "email"]] = Field(
        default=["push"], description="Bildirim yöntemleri"
    )
    priority: int = Field(default=1, ge=1, le=5, description="Öncelik sırası (1=En yüksek)")

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        """İsim boş olamaz."""
        if not v.strip():
            raise ValueError("İsim boş olamaz.")
        return v.strip()

    @field_validator("phone")
    @classmethod
    def phone_format(cls, v: str) -> str:
        """Telefon numarası basit format kontrolü."""
        cleaned = v.strip()
        if not cleaned:
             raise ValueError("Telefon numarası boş olamaz.")
        # Basit kontrol: sadece rakam ve +, boşluk içerebilir
        if not cleaned.replace("+", "").replace(" ", "").isdigit():
            raise ValueError("Geçersiz telefon numarası.")
        return cleaned


class EmergencyContactOut(BaseModel):
    """Acil kişi yanıt şeması."""

    id: int
    name: str
    phone: str
    email: Optional[str]
    relation: str
    methods: List[str]
    priority: int

    model_config = {"from_attributes": True}
