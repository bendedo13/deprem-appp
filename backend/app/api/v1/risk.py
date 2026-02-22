"""
Risk skoru hesaplama endpoint'i.
Konum ve bina bazlı gelişmiş risk analizi.
"""

import logging
from datetime import datetime
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, Response
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.services.risk_calculator import RiskCalculator, RiskResult
from app.services.report_generator import RiskReportGenerator
from app.api.v1.users import get_current_user
from app.models.user import User

logger = logging.getLogger(__name__)
router = APIRouter()


class RiskScoreIn(BaseModel):
    """Risk skoru hesaplama girdisi."""
    latitude: float = Field(..., ge=-90.0, le=90.0, description="Enlem")
    longitude: float = Field(..., ge=-180.0, le=180.0, description="Boylam")
    building_year: int = Field(default=2000, ge=1900, le=2026, description="Bina yapım yılı")
    soil_class: str = Field(default="UNKNOWN", description="Zemin sınıfı (Z1, Z2, Z3, Z4, UNKNOWN)")


class RiskScoreOut(BaseModel):
    """Risk skoru yanıt şeması."""
    score: float = Field(description="Risk skoru (0-10 arası)")
    level: str = Field(description="Risk seviyesi (Düşük, Orta, Yüksek, Çok Yüksek)")
    nearest_fault: str = Field(description="En yakın fay hattı")
    fault_distance_km: float = Field(description="En yakın fay hattına mesafe (km)")
    soil_class: str = Field(description="Analiz edilen zemin sınıfı")
    building_year: int = Field(description="Analiz edilen bina yılı")
    factors: Dict[str, float] = Field(description="Hesaplamada kullanılan alt risk faktörleri")
    recommendations: List[str] = Field(description="Kişiselleştirilmiş öneriler")


@router.post("/score", response_model=RiskScoreOut, summary="Gelişmiş risk skoru hesapla")
async def score(
    body: RiskScoreIn, 
    db: AsyncSession = Depends(get_db)
) -> RiskScoreOut:
    """
    Konum ve bina detaylarına göre gelişmiş risk analizi yapar. 
    Fay mesafesi, zemin türü ve bina yaşı faktörlerini birleştirir.
    """
    calculator = RiskCalculator()
    result: RiskResult = await calculator.calculate(
        lat=body.latitude,
        lon=body.longitude,
        building_year=body.building_year,
        soil_class=body.soil_class
    )

    return RiskScoreOut(
        score=result.score,
        level=result.level,
        nearest_fault=result.nearest_fault,
        fault_distance_km=result.fault_distance_km,
        soil_class=result.soil_class,
        building_year=result.building_year,
        factors=result.factors,
        recommendations=result.recommendations
    )


@router.post("/report", summary="Risk analiz raporu üret (PDF)")
async def generate_report(
    body: RiskScoreIn,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Response:
    """
    Konum ve bina detaylarına göre risk analizi yapar ve PDF raporu üretir.
    """
    calculator = RiskCalculator()
    result: RiskResult = await calculator.calculate(
        lat=body.latitude,
        lon=body.longitude,
        building_year=body.building_year,
        soil_class=body.soil_class
    )
    
    generator = RiskReportGenerator()
    pdf_bytes = generator.generate(result, current_user.email)
    
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=quakesense_risk_report_{datetime.now().strftime('%Y%m%d')}.pdf"
        }
    )
