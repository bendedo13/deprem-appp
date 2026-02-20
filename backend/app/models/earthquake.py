"""
Deprem ORM modeli — TimescaleDB hypertable ile zaman serisi optimizasyonu.
"""

from datetime import datetime
from sqlalchemy import Column, String, Float, DateTime, Index
from sqlalchemy.sql import func

from app.database import Base


class Earthquake(Base):
    """
    Deprem kaydı.
    TimescaleDB ile occurred_at üzerinden hypertable oluşturulması önerilir.
    """

    __tablename__ = "earthquakes"

    # Kaynak bazlı birleşik ID (örn: "afad-2024001234")
    id: str = Column(String(64), primary_key=True)

    # Veri kaynağı: afad | kandilli | usgs | emsc
    source: str = Column(String(16), nullable=False, index=True)

    # Deprem parametreleri
    magnitude: float = Column(Float, nullable=False)
    depth: float = Column(Float, nullable=False)
    latitude: float = Column(Float, nullable=False)
    longitude: float = Column(Float, nullable=False)
    location: str = Column(String(256), nullable=False)
    magnitude_type: str = Column(String(8), nullable=False, default="ML")

    # Zaman (deprem zamanı — TimescaleDB partition key)
    occurred_at: datetime = Column(
        DateTime(timezone=True),
        nullable=False,
        index=True,
    )

    # İlk kayıt zamanı
    created_at: datetime = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    __table_args__ = (
        # Şiddet + zaman — sık kullanılan filtre kombinasyonu
        Index("ix_eq_magnitude_occurred", "magnitude", "occurred_at"),
        # Coğrafi kutu sorguları
        Index("ix_eq_lat_lon", "latitude", "longitude"),
    )

    def __repr__(self) -> str:
        return (
            f"<Earthquake id={self.id} mag={self.magnitude} "
            f"loc={self.location!r} at={self.occurred_at}>"
        )
