"""
Bildirim geçmişi modeli.
Admin panelinden ve otomatik olarak gönderilen tüm bildirimlerin kaydı.
"""

from datetime import datetime
from typing import Optional

from sqlalchemy import String, Integer, Float, DateTime, Boolean, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.database import Base


class NotificationLog(Base):
    """Gönderilen tüm bildirimlerin logu — admin panelinden görüntülenir."""

    __tablename__ = "notification_logs"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    image_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    
    # Hedef bilgisi
    target_type: Mapped[str] = mapped_column(
        String(20), nullable=False, default="broadcast",
        comment="broadcast | user | segment"
    )
    target_user_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    
    # Sonuçlar
    total_targets: Mapped[int] = mapped_column(Integer, default=0)
    sent_count: Mapped[int] = mapped_column(Integer, default=0)
    failed_count: Mapped[int] = mapped_column(Integer, default=0)
    
    # Gönderen admin
    sent_by: Mapped[int | None] = mapped_column(Integer, nullable=True)
    
    # Ek veri (aksiyonlar vs.)
    data: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    def __repr__(self) -> str:
        return f"<NotificationLog id={self.id} title='{self.title}' target={self.target_type}>"
