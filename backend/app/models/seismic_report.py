"""
SeismicReport SQLAlchemy modeli.
Cihazlardan gelen titreşim raporlarını saklar.
rules.md: type hints zorunlu, docstring yazılmalı.
"""

from datetime import datetime
from sqlalchemy import String, Float, Integer, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class SeismicReport(Base):
    """
    Cihaz sensöründen gelen tekil titreşim raporu.
    Her cihaz trigger olduğunda bir kayıt oluşturulur.
    """

    __tablename__ = "seismic_reports"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    device_id: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    peak_acceleration: Mapped[float] = mapped_column(Float, nullable=False)
    sta_lta_ratio: Mapped[float] = mapped_column(Float, nullable=False)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    cluster_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    reported_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )

    def __repr__(self) -> str:
        return (
            f"<SeismicReport id={self.id} device={self.device_id!r} "
            f"peak={self.peak_acceleration:.2f} lat={self.latitude:.4f}>"
        )
