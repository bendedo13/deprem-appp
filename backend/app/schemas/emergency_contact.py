"""
Acil iletişim kişisi Pydantic şemaları.
"""

from typing import List, Optional

from pydantic import BaseModel, EmailStr, Field


class EmergencyContactIn(BaseModel):
    """Acil kişi oluşturma/güncelleme isteği."""
    name: str = Field(..., min_length=1, max_length=255)
    phone: Optional[str] = Field(None, max_length=32)
    email: Optional[EmailStr] = None
    relation: str = Field(default="Diğer", max_length=50)
    methods: List[str] = Field(default=["push"])
    priority: int = Field(default=1, ge=1, le=10)


class EmergencyContactOut(BaseModel):
    """Acil kişi yanıtı."""
    id: int
    user_id: int
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    relation: str = "Diğer"
    methods: List[str] = ["push"]
    priority: int = 1

    model_config = {"from_attributes": True}