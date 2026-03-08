"""
Destek talebi endpoint'leri.
Kullanıcılar uygulama içinden destek talebi oluşturabilir.
"""

import logging
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.support_ticket import SupportTicket

logger = logging.getLogger(__name__)
router = APIRouter()

VALID_CATEGORIES = {"general", "bug", "feature", "account", "other"}


class TicketIn(BaseModel):
    email: str = Field(..., max_length=255)
    subject: str = Field(..., min_length=5, max_length=200)
    message: str = Field(..., min_length=10, max_length=5000)
    category: str = Field(default="general")


class TicketOut(BaseModel):
    id: int
    email: str
    subject: str
    message: str
    category: str
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


@router.post("/tickets", response_model=TicketOut, summary="Destek talebi oluştur")
async def create_ticket(
    body: TicketIn,
    db: AsyncSession = Depends(get_db),
) -> TicketOut:
    """
    Yeni destek talebi oluşturur. Kimlik doğrulaması gerekmez.
    """
    category = body.category if body.category in VALID_CATEGORIES else "general"

    ticket = SupportTicket(
        email=body.email,
        subject=body.subject,
        message=body.message,
        category=category,
        status="open",
    )
    db.add(ticket)
    try:
        await db.commit()
        await db.refresh(ticket)
    except Exception as exc:
        await db.rollback()
        logger.error("Destek talebi oluşturulamadı: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail="Destek talebi gönderilemedi.")

    logger.info("Yeni destek talebi: id=%d email=%s", ticket.id, ticket.email)
    return TicketOut.model_validate(ticket)
