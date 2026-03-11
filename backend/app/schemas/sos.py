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


# ── S.O.S Test Endpoint Schemas ────────────────────────────────────────────

class SOSTestRequest(BaseModel):
    """Senkron Twilio test isteği — Celery bypass, direkt API."""

    phone_numbers: list[str] = Field(
        ...,
        min_length=1,
        description="E.164 formatında test edilecek numaralar (+905551234567)",
    )
    message: str = Field(
        default="QuakeSense TEST: Acil iletişim testi başarılı.",
        max_length=500,
        description="Gönderilecek test mesajı",
    )
    channel: str = Field(
        default="waterfall",
        pattern="^(waterfall|sms|whatsapp)$",
        description="Kanal: waterfall | sms | whatsapp",
    )


class SOSTestContactResult(BaseModel):
    """Tek bir numara için test sonucu."""
    phone: str
    whatsapp_attempted: bool
    whatsapp_success: bool
    sms_attempted: bool
    sms_success: bool
    fallback_used: bool
    error: Optional[str] = None


class SOSTestResponse(BaseModel):
    """Senkron test endpoint yanıtı — anında sonuç döner."""
    success: bool
    whatsapp_sent: int
    sms_sent: int
    failed: int
    total: int
    fallback_used: bool
    details: list[SOSTestContactResult]
    message: str
