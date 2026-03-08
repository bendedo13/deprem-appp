"""
Sağlık Kartı API endpoint'leri.
Kullanıcı acil sağlık bilgilerini yönetir (kan grubu, alerjiler, ilaçlar, vs.).
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.api.v1.users import get_current_user
from app.models.user import User
from app.models.health_card import HealthCard

logger = logging.getLogger(__name__)
router = APIRouter()


class HealthCardIn(BaseModel):
    blood_type: str = Field(default="Bilinmiyor", max_length=20)
    allergies: str = Field(default="", max_length=500)
    medications: str = Field(default="", max_length=500)
    conditions: str = Field(default="", max_length=500)
    emergency_note: str = Field(default="", max_length=500)


class HealthCardOut(BaseModel):
    blood_type: str
    allergies: str
    medications: str
    conditions: str
    emergency_note: str
    model_config = {"from_attributes": True}


@router.get("", response_model=HealthCardOut, summary="Sağlık kartını getir")
async def get_health_card(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> HealthCardOut:
    result = await db.execute(
        select(HealthCard).where(HealthCard.user_id == current_user.id)
    )
    card = result.scalar_one_or_none()
    if not card:
        return HealthCardOut(
            blood_type="Bilinmiyor",
            allergies="",
            medications="",
            conditions="",
            emergency_note="",
        )
    return HealthCardOut.model_validate(card)


@router.put("", response_model=HealthCardOut, summary="Sağlık kartını güncelle")
async def upsert_health_card(
    body: HealthCardIn,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> HealthCardOut:
    result = await db.execute(
        select(HealthCard).where(HealthCard.user_id == current_user.id)
    )
    card = result.scalar_one_or_none()

    if card:
        card.blood_type = body.blood_type
        card.allergies = body.allergies
        card.medications = body.medications
        card.conditions = body.conditions
        card.emergency_note = body.emergency_note
    else:
        card = HealthCard(
            user_id=current_user.id,
            blood_type=body.blood_type,
            allergies=body.allergies,
            medications=body.medications,
            conditions=body.conditions,
            emergency_note=body.emergency_note,
        )
        db.add(card)

    try:
        await db.commit()
        await db.refresh(card)
    except Exception as exc:
        await db.rollback()
        logger.error("Sağlık kartı kaydedilemedi: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail="Sağlık kartı kaydedilemedi.")

    return HealthCardOut.model_validate(card)
