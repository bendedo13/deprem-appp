"""
Bildirim tercihi modeli.
Kullanıcının hangi büyüklük ve yarıçapdaki depremlerde bildirim alacağını saklar.
"""

from sqlalchemy import Boolean, Float, ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import TYPE_CHECKING

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
    min_magnitude: Mapped[float] = mapped_column(Float, nullable=False, default=3.0)
    radius_km: Mapped[float] = mapped_column(Float, nullable=False, default=500.0)
    is_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    user: Mapped["User"] = relationship("User", back_populates="notification_pref")

    def __repr__(self) -> str:
        return (
            f"<NotificationPref user_id={self.user_id} "
            f"min_mag={self.min_magnitude} radius={self.radius_km}km>"
        )
