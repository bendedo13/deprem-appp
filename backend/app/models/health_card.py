"""Sağlık Kartı modeli — kullanıcı acil sağlık bilgileri."""

from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, func
from app.database import Base


class HealthCard(Base):
    __tablename__ = "health_cards"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    blood_type = Column(String(20), default="Bilinmiyor")
    allergies = Column(Text, default="")
    medications = Column(Text, default="")
    conditions = Column(Text, default="")
    emergency_note = Column(Text, default="")
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
