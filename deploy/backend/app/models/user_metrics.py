from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import uuid


class UserMetrics(Base):
    __tablename__ = "user_metrics"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False, unique=True)
    sos_usage_count = Column(Integer, default=0)
    anomaly_report_count = Column(Integer, default=0)
    earthquake_alerts_received = Column(Integer, default=0)
    app_open_count = Column(Integer, default=0)
    last_sos_at = Column(DateTime(timezone=True), nullable=True)
    last_anomaly_report_at = Column(DateTime(timezone=True), nullable=True)
    last_active_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", back_populates="user_metrics")