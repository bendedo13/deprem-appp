"""
S.O.S Voice Alert kayıtları için database model.
Kullanıcıların sesli acil durum bildirimlerini saklar.
"""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Column, String, Integer, Float, DateTime, Text, Index, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.user import User


class SOSRecord(Base):
    """S.O.S sesli bildirim kaydı."""

    __tablename__ = "sos_records"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # Extracted structured data
    durum = Column(String(50), nullable=False)  # "Enkaz Altında", "Güvende", "Bilinmiyor"
    kisi_sayisi = Column(Integer, nullable=False, default=1)
    aciliyet = Column(String(20), nullable=False)  # "Kırmızı", "Sarı", "Yeşil"
    lokasyon = Column(Text, nullable=False)
    orijinal_metin = Column(Text, nullable=True)  # Whisper transcription

    # Audio storage
    audio_url = Column(String(500), nullable=False)
    audio_filename = Column(String(255), nullable=False)

    # GPS coordinates
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)

    # Processing status
    processing_status = Column(String(20), default="pending")  # pending, processing, completed, failed
    error_message = Column(Text, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="sos_records")

    # Indexes for efficient querying
    __table_args__ = (
        Index('idx_sos_user_created', 'user_id', 'created_at'),
        Index('idx_sos_aciliyet', 'aciliyet'),
        Index('idx_sos_status', 'processing_status'),
    )

    def __repr__(self) -> str:
        return f"<SOSRecord(id={self.id}, user_id={self.user_id}, durum={self.durum}, aciliyet={self.aciliyet})>"
