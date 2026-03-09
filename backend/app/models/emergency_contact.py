"""
Acil durum kişisi modeli — sadeleştirilmiş.
S.O.S veya Erken Uyarı tetiklendiğinde Twilio ile SMS/WhatsApp gönderilir.
"""

from typing import TYPE_CHECKING

from sqlalchemy import String, Integer, ForeignKey, Boolean
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
    phone_number: Mapped[str] = mapped_column(String(32), nullable=False)
    relationship: Mapped[str] = mapped_column(String(50), default="Diğer", nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    user: Mapped["User"] = relationship("User", back_populates="emergency_contacts")
