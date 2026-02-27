from sqlalchemy import Column, String, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import uuid


class Page(Base):
    __tablename__ = "pages"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    slug = Column(String, unique=True, nullable=False, index=True)
    title = Column(String, nullable=False)
    content = Column(Text, nullable=False, default="")
    meta_description = Column(String, nullable=True)
    is_published = Column(Boolean, default=False)
    page_type = Column(String, default="static")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    images = relationship("PageImage", back_populates="page", cascade="all, delete-orphan")


class PageImage(Base):
    __tablename__ = "page_images"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    page_id = Column(String, ForeignKey("pages.id"), nullable=False)
    url = Column(String, nullable=False)
    alt_text = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    page = relationship("Page", back_populates="images")


class BlogPost(Base):
    __tablename__ = "blog_posts"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String, nullable=False)
    slug = Column(String, unique=True, nullable=False, index=True)
    content = Column(Text, nullable=False, default="")
    excerpt = Column(Text, nullable=True)
    cover_image_url = Column(String, nullable=True)
    is_published = Column(Boolean, default=False)
    author_id = Column(String, ForeignKey("users.id"), nullable=True)
    meta_description = Column(String, nullable=True)
    tags = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    author = relationship("User", back_populates="blog_posts")