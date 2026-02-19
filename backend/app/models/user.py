"""
Kullanıcı ve acil durum kişisi modelleri.
Acil kişilere 'depreme yakalandım' bildirimi için kullanılır.
"""

from datetime import datetime
from typing import TYPE_CHECKING, List

from sqlalchemy import String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.emergency_contact import EmergencyContact


class User(Base):
    """Kullanıcı: konum ve FCM token bölge bildirimi için."""

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    fcm_token: Mapped[str | None] = mapped_column(String(512), nullable=True)
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    emergency_contacts: Mapped[List["EmergencyContact"]] = relationship(
        "EmergencyContact", back_populates="user", lazy="selectin"
    )
