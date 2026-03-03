"""
Kullanıcı ORM modeli.
JWT kimlik doğrulama, FCM push bildirimi ve konum takibi için alanlar içerir.
"""

from datetime import datetime
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import Boolean, DateTime, Float, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.database import Base

if TYPE_CHECKING:
    from app.models.emergency_contact import EmergencyContact
    from app.models.notification_pref import NotificationPref
    from app.models.sos_record import SOSRecord


class User(Base):
    """Kullanıcı kaydı. E-posta + bcrypt şifre ile kimlik doğrulama."""

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)

    # Hesap durumu
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    is_admin: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    # Profil bilgileri
    name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    avatar: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    plan: Mapped[str] = mapped_column(String(20), nullable=False, default="free")

    # Push bildirim token'ı
    fcm_token: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)

    # Konum (son bilinen)
    latitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    longitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # Zaman damgaları
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    join_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # İlişkiler
    emergency_contacts: Mapped[List["EmergencyContact"]] = relationship(
        "EmergencyContact",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="select",
    )
    notification_pref: Mapped[Optional["NotificationPref"]] = relationship(
        "NotificationPref",
        back_populates="user",
        cascade="all, delete-orphan",
        uselist=False,
        lazy="select",
    )
    sos_records: Mapped[List["SOSRecord"]] = relationship(
        "SOSRecord",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="select",
    )

    def __repr__(self) -> str:
        return f"<User id={self.id} email={self.email!r} admin={self.is_admin}>"