"""
Kullanıcı modeli.
JWT kimlik doğrulama, FCM push bildirimi, abonelik ve konum tabanlı uyarılar için kullanılır.
"""

from datetime import datetime, timedelta, timezone
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import String, Float, DateTime, Boolean, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.database import Base

if TYPE_CHECKING:
    from app.models.emergency_contact import EmergencyContact
    from app.models.notification_pref import NotificationPref
    from app.models.sos_record import SOSRecord


class User(Base):
    """Kullanıcı: JWT auth, FCM token, abonelik ve konum tabanlı bildirim için."""

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    
    # Profil Bilgileri
    name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    avatar: Mapped[str | None] = mapped_column(String(10), nullable=True)  # Emoji avatar
    plan: Mapped[str] = mapped_column(String(20), default="free", nullable=False)

    # ── Abonelik (Subscription) alanları ──────────────────────────────────────
    subscription_plan: Mapped[str] = mapped_column(
        String(20), default="free", server_default="free", nullable=False,
        comment="free | trial | monthly_pro | yearly_pro"
    )
    subscription_expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True,
        comment="Pro/Trial bitiş tarihi. NULL = süresiz (free)"
    )
    trial_used: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default="false", nullable=False,
        comment="10 günlük deneme hakkı kullanıldı mı"
    )

    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    
    fcm_token: Mapped[str | None] = mapped_column(String(512), nullable=True)
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    join_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    emergency_contacts: Mapped[List["EmergencyContact"]] = relationship(
        "EmergencyContact", back_populates="user", lazy="selectin", cascade="all, delete-orphan"
    )
    notification_pref: Mapped[Optional["NotificationPref"]] = relationship(
        "NotificationPref", back_populates="user", uselist=False, lazy="selectin", cascade="all, delete-orphan"
    )
    sos_records: Mapped[List["SOSRecord"]] = relationship(
        "SOSRecord", back_populates="user", lazy="select"
    )

    @property
    def is_pro(self) -> bool:
        """Kullanıcı şu an Pro (veya aktif Trial) mu?"""
        if self.subscription_plan == "free":
            return False
        if self.subscription_expires_at is None:
            return self.subscription_plan in ("monthly_pro", "yearly_pro", "trial")
        return self.subscription_expires_at > datetime.now(tz=timezone.utc)

    @property
    def effective_plan(self) -> str:
        """Gerçek aktif plan: süresi dolmuşsa 'free' döner."""
        if self.is_pro:
            return self.subscription_plan
        return "free"

    def activate_trial(self) -> bool:
        """10 günlük Pro deneme başlat. Daha önce kullanıldıysa False döner."""
        if self.trial_used:
            return False
        self.subscription_plan = "trial"
        self.subscription_expires_at = datetime.now(tz=timezone.utc) + timedelta(days=10)
        self.trial_used = True
        return True

    def __repr__(self) -> str:
        return f"<User id={self.id} email={self.email!r}>"
