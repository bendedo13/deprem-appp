"""
S.O.S Voice Alert için Pydantic schemas.
API request/response validation.
"""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class SOSAnalyzeResponse(BaseModel):
    """S.O.S analyze endpoint response (async task başlatıldı)."""

    task_id: str = Field(..., description="Celery task ID for tracking")
    status: str = Field(default="accepted", description="Initial status")
    message: str = Field(default="S.O.S kaydınız işleniyor...", description="User message")


class ExtractedSOSData(BaseModel):
    """AI tarafından çıkarılan yapılandırılmış S.O.S verisi."""

    sos_id: str = Field(..., description="S.O.S record UUID")
    durum: str = Field(..., description="Enkaz Altında | Güvende | Bilinmiyor")
    kisi_sayisi: int = Field(..., ge=1, description="Kişi sayısı")
    aciliyet: str = Field(..., description="Kırmızı | Sarı | Yeşil")
    lokasyon: str = Field(..., description="Konum bilgisi veya GPS")
    orijinal_metin: str = Field(..., description="Whisper transcription")


class SOSStatusResponse(BaseModel):
    """S.O.S processing status response."""

    status: str = Field(..., description="pending | processing | completed | failed")
    extracted_data: Optional[ExtractedSOSData] = Field(None, description="Extracted data when completed")
    error_message: Optional[str] = Field(None, description="Error message when failed")


class SOSRecordOut(BaseModel):
    """S.O.S record database output."""

    id: UUID
    user_id: int
    durum: str
    kisi_sayisi: int
    aciliyet: str
    lokasyon: str
    orijinal_metin: Optional[str]
    audio_url: str
    audio_filename: str
    latitude: Optional[float]
    longitude: Optional[float]
    processing_status: str
    error_message: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
