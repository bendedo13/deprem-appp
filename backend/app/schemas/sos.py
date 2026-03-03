"""
S.O.S Voice Alert Pydantic şemaları.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class SOSAnalyzeResponse(BaseModel):
    """SOS analiz başlatma yanıtı."""
    task_id: str
    status: str
    message: str


class ExtractedSOSData(BaseModel):
    """Ses kaydından çıkarılan SOS verisi."""
    durum: str = Field(description="Durum açıklaması")
    kisi_sayisi: int = Field(default=1, description="Kişi sayısı")
    aciliyet: str = Field(default="orta", description="Aciliyet seviyesi")
    lokasyon: str = Field(default="", description="Konum bilgisi")
    orijinal_metin: Optional[str] = Field(None, description="Transkript metni")


class SOSStatusResponse(BaseModel):
    """SOS işleme durumu yanıtı."""
    status: str = Field(description="pending/processing/completed/failed")
    extracted_data: Optional[ExtractedSOSData] = None
    error_message: Optional[str] = None


class SOSRecordOut(BaseModel):
    """SOS kaydı yanıtı."""
    id: str
    user_id: int
    durum: str
    kisi_sayisi: int
    aciliyet: str
    lokasyon: str
    orijinal_metin: Optional[str] = None
    audio_url: str
    audio_filename: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    processing_status: Optional[str] = None
    error_message: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}