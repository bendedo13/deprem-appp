from sqlalchemy import Column, String, Boolean, DateTime, Enum, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import uuid
import enum


class UserRole(str, enum.Enum):
    USER = "user"
    PREMIUM = "premium"
    B2B = "b2b"
    ADMIN = "admin"
    SUPERADMIN = "superadmin"


class BanStatus(str, enum.Enum):
    ACTIVE = "active"
    BANNED = "banned"
    SUSPENDED = "suspended"


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, nullable=False, index=True)
    firebase_uid = Column(String, unique=True, nullable=True, index=True)
    full_name = Column(String, nullable=True)
    avatar_url = Column(String, nullable=True)
    role = Column(Enum(UserRole), default=UserRole.USER)
    ban_status = Column(Enum(BanStatus), default=BanStatus.ACTIVE)
    ban_reason = Column(Text, nullable=True)
    banned_at = Column(DateTime(timezone=True), nullable=True)
    banned_until = Column(DateTime(timezone=True), nullable=True)
    is_active = Column(Boolean, default=True)
    last_login_at = Column(DateTime(timezone=True), nullable=True)
    sos_usage_count = Column(Integer, default=0) if False else None
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    subscription = relationship("Subscription", back_populates="user", uselist=False)
    api_keys = relationship("APIKey", back_populates="user")
    notifications = relationship("Notification", back_populates="user")
    blog_posts = relationship("BlogPost", back_populates="author")
    user_metrics = relationship("UserMetrics", back_populates="user", uselist=False)