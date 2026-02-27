from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey, BigInteger
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import uuid


class APIKey(Base):
    __tablename__ = "api_keys"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    key_hash = Column(String, unique=True, nullable=False, index=True)
    key_prefix = Column(String(8), nullable=False)
    name = Column(String, nullable=False)
    company_name = Column(String, nullable=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    rate_limit_per_hour = Column(Integer, default=1000)
    rate_limit_per_day = Column(Integer, default=10000)
    is_active = Column(Boolean, default=True)
    total_requests = Column(BigInteger, default=0)
    monthly_requests = Column(BigInteger, default=0)
    last_used_at = Column(DateTime(timezone=True), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", back_populates="api_keys")
    usage_logs = relationship("APIKeyUsageLog", back_populates="api_key", cascade="all, delete-orphan")


class APIKeyUsageLog(Base):
    __tablename__ = "api_key_usage_logs"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    api_key_id = Column(String, ForeignKey("api_keys.id"), nullable=False)
    endpoint = Column(String, nullable=True)
    status_code = Column(Integer, nullable=True)
    response_time_ms = Column(Integer, nullable=True)
    ip_address = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    api_key = relationship("APIKey", back_populates="usage_logs")