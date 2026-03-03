"""
S.O.S Voice Alert kayıtları için database model.
Kullanıcıların sesli acil durum bildirimlerini saklar.
"""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Column, String, Integer, Float, DateTime, Text, Index, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship, Mapped, mapped_column

from app.database import Base

if TYPE_CHECKING:
    from app.models.user import User


class SOSRecord(Base):
    """S.O.S sesli bildirim kaydı."""

    __tablename__ = "sos_records"

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    user_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Analiz sonuçları
    durum: Mapped[str] = mapped_column(String(50), nullable=False)
    kisi_sayisi: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    aciliyet: Mapped[str] = mapped_column(String(20), nullable=False, default="orta")
    lokasyon: Mapped[str] = mapped_column(Text, nullable=False, default="")
    orijinal_metin: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Ses dosyası bilgileri
    audio_url: Mapped[str] = mapped_column(String(500), nullable=False, default="")
    audio_filename: Mapped[str] = mapped_column(String(255), nullable=False, default="")

    # GPS koordinatları
    latitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    longitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # İşleme durumu
    processing_status: Mapped[Optional[str]] = mapped_column(
        String(20), nullable=True, default="pending"
    )
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Zaman damgaları
    created_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime, nullable=True, default=datetime.utcnow
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime, nullable=True, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # İlişki
    user: Mapped["User"] = relationship("User", back_populates="sos_records")

    __table_args__ = (
        Index("idx_sos_user_created", "user_id", "created_at"),
        Index("idx_sos_aciliyet", "aciliyet"),
        Index("idx_sos_status", "processing_status"),
    )

    def __repr__(self) -> str:
        return (
            f"<SOSRecord id={self.id} user_id={self.user_id} "
            f"durum={self.durum!r} aciliyet={self.aciliyet!r}>"
        )