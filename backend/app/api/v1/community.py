"""
Topluluk raporu endpoint'leri.
Anlık hasar bildirimleri — yol kapanması, yangın, bina hasarı vs.
"""

import logging
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.community_report import CommunityReport

logger = logging.getLogger(__name__)
router = APIRouter()

VALID_CATEGORIES = {
    "road_closed", "fire", "building_damage",
    "flood", "injury", "safe", "rescue_needed", "other"
}


class ReportIn(BaseModel):
    category: str = Field(..., description="Rapor kategorisi")
    description: Optional[str] = Field(None, max_length=500)
    district: Optional[str] = Field(None, max_length=100)
    latitude: Optional[float] = Field(None, ge=-90, le=90)
    longitude: Optional[float] = Field(None, ge=-180, le=180)


class ReportOut(BaseModel):
    id: int
    category: str
    description: Optional[str] = None
    district: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    created_at: datetime
    model_config = {"from_attributes": True}


@router.post("/reports", response_model=ReportOut, status_code=201, summary="Hasar raporu oluştur")
async def create_report(
    body: ReportIn,
    db: AsyncSession = Depends(get_db),
) -> ReportOut:
    """Anlık hasar/durum raporu oluşturur. Kimlik doğrulaması gerekmez."""
    category = body.category if body.category in VALID_CATEGORIES else "other"

    report = CommunityReport(
        category=category,
        description=body.description,
        district=body.district,
        latitude=body.latitude,
        longitude=body.longitude,
    )
    db.add(report)
    try:
        await db.commit()
        await db.refresh(report)
    except Exception as exc:
        await db.rollback()
        logger.error("Rapor oluşturulamadı: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail="Rapor gönderilemedi.")

    return ReportOut.model_validate(report)


@router.get("/reports", response_model=List[ReportOut], summary="Son raporları listele")
async def list_reports(
    hours: int = Query(24, ge=1, le=168, description="Son kaç saatin raporları (max 7 gün)"),
    category: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
) -> List[ReportOut]:
    """Son raporları döner. Filtreleme: saat aralığı ve kategori."""
    cutoff = datetime.now(tz=timezone.utc) - timedelta(hours=hours)
    q = (
        select(CommunityReport)
        .where(CommunityReport.created_at >= cutoff)
        .order_by(CommunityReport.created_at.desc())
        .limit(limit)
    )
    if category and category in VALID_CATEGORIES:
        q = q.where(CommunityReport.category == category)

    result = await db.execute(q)
    return [ReportOut.model_validate(r) for r in result.scalars().all()]
