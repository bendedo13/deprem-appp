"""
Deprem sonrası kullanıcı hasar/engel bildirimleri için model.
Live Impact Map özelliği için konumsal raporları saklar.
"""

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.user import User


class UserReport(Base):
    """Kullanıcı hasar/engel bildirimi."""

    __tablename__ = "user_reports"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)

    report_type = Column(String(30), nullable=False)  # building_damage | road_blocked | fire | other
    description = Column(Text, nullable=True)

    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    user = relationship("User", back_populates="user_reports")

    __table_args__ = (
        Index("idx_user_reports_type", "report_type"),
        Index("idx_user_reports_geo", "latitude", "longitude"),
    )

    def __repr__(self) -> str:
        return f"<UserReport id={self.id} type={self.report_type!r}>"

