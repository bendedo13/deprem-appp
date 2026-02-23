"""
Acil durum kişisi modeli.
Deprem doğrulandığında bu kişilere 'Şu konumda depreme yakalandım' mesajı gider.
"""

from typing import TYPE_CHECKING, List

from sqlalchemy import String, Integer, ForeignKey, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.user import User


class EmergencyContact(Base):
    """Kullanıcının acil durumda aranacak kişisi."""

    __tablename__ = "emergency_contacts"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(32), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    
    relation: Mapped[str] = mapped_column(String(50), default="Diğer", nullable=False)
    methods: Mapped[List[str]] = mapped_column(JSON, default=["push"], nullable=False) # JSON list of strings
    priority: Mapped[int] = mapped_column(Integer, default=1, nullable=False)

    user: Mapped["User"] = relationship("User", back_populates="emergency_contacts")
