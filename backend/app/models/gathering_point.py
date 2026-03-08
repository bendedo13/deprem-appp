"""
Afet toplanma alanları için model.
AFAD benzeri statik/senkronize edilen güvenli alanları temsil eder.
"""

from datetime import datetime

from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime

from app.database import Base


class GatheringPoint(Base):
    """Türkiye geneli güvenli toplanma alanı."""

    __tablename__ = "gathering_points"

    id = Column(Integer, primary_key=True, autoincrement=True)

    name = Column(String(200), nullable=False)
    city = Column(String(100), nullable=False, index=True)
    district = Column(String(100), nullable=False, index=True)

    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)

    capacity = Column(Integer, nullable=True)
    has_water = Column(Boolean, nullable=False, default=False)
    has_electricity = Column(Boolean, nullable=False, default=False)
    has_shelter = Column(Boolean, nullable=False, default=False)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    def __repr__(self) -> str:
        return f"<GatheringPoint id={self.id} name={self.name!r} city={self.city!r}>"

