"""
Bildirim tercihi modeli.
Kullanıcının hangi büyüklük ve yarıçapdaki depremlerde bildirim alacağını saklar.
"""

from datetime import time
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import Boolean, Float, ForeignKey, Integer, JSON, String, Time, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.user import User


class NotificationPref(Base):
    """Kullanıcıya özgü bildirim tercihleri. Her kullanıcı için tek kayıt (unique user_id)."""

    __tablename__ = "notification_prefs"
    __table_args__ = (UniqueConstraint("user_id", name="uq_notification_prefs_user"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )

    # Minimum büyüklük eşiği
    min_magnitude: Mapped[float] = mapped_column(Float, nullable=False, default=3.0)

    # Takip edilen konumlar (JSON liste)
    locations: Mapped[List[str]] = mapped_column(JSON, nullable=False, default=list)

    # Bildirim kanalları
    push_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    sms_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    email_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    # Sessiz saatler
    quiet_hours_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    quiet_start: Mapped[Optional[time]] = mapped_column(Time, nullable=True)
    quiet_end: Mapped[Optional[time]] = mapped_column(Time, nullable=True)

    # Ek özellikler
    weekly_summary: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    aftershock_alerts: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    # Geriye dönük uyumluluk için eski alanlar (migration 001'den)
    # Bu alanlar DB'de var ama yeni API'de kullanılmıyor
    radius_km: Mapped[float] = mapped_column(Float, nullable=False, default=500.0)
    is_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    user: Mapped["User"] = relationship("User", back_populates="notification_pref")

    def __repr__(self) -> str:
        return (
            f"<NotificationPref user_id={self.user_id} "
            f"min_mag={self.min_magnitude} push={self.push_enabled}>"
        )