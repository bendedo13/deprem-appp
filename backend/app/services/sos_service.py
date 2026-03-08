"""
Hibrit S.O.S servisi — Twilio SMS + Twilio WhatsApp.

Akış:
- channel = "sms"      → yalnızca SMS
- channel = "whatsapp" → yalnızca Twilio WhatsApp
- channel = "hybrid"   → önce SMS, ardından WhatsApp (ikisini de dene, böylece
  hem SMS hem WhatsApp iletilmiş olur; biri başarısız olsa da diğeri denenir).
"""

from __future__ import annotations

import asyncio
import logging
from typing import Iterable, List, Literal, TypedDict, Mapping, Any

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session

from app.models.app_settings import AppSettings
from app.services.twilio_sms import get_twilio_service

logger = logging.getLogger(__name__)

Channel = Literal["sms", "whatsapp", "hybrid"]


class SOSHybridResult(TypedDict):
    sms_sent: int
    whatsapp_sent: int
    tried_sms: bool
    tried_whatsapp: bool


class _SafeDict(dict):
    """Template engine için eksik key'lerde boş string döndüren dict."""

    def __missing__(self, key: str) -> str:  # type: ignore[override]
        return ""


def render_template_sync(
    db: Session,
    key: str,
    default: str,
    context: Mapping[str, Any],
) -> str:
    """Senkron ortamlar için şablon render fonksiyonu (Celery, script vb.)."""
    setting = db.get(AppSettings, key)
    template = setting.value if setting else default
    return template.format_map(_SafeDict(context))


async def render_template_async(
    db: AsyncSession,
    key: str,
    default: str,
    context: Mapping[str, Any],
) -> str:
    """Async ortamlar için şablon render fonksiyonu (FastAPI endpoint'leri)."""
    setting = await db.get(AppSettings, key)
    template = setting.value if setting else default
    return template.format_map(_SafeDict(context))


async def send_hybrid_via_twilio(
    phone_numbers: Iterable[str],
    message: str,
    channel: Channel = "hybrid",
) -> SOSHybridResult:
    """
    Twilio üzerinden hibrit bildirim gönderir.

    Args:
        phone_numbers: E.164 formatında numaralar (örn: +905551234567)
        message: Gönderilecek metin
        channel: "sms" | "whatsapp" | "hybrid"
    """
    numbers: List[str] = [p for p in set(phone_numbers) if p]
    if not numbers:
        return {"sms_sent": 0, "whatsapp_sent": 0, "tried_sms": False, "tried_whatsapp": False}

    channel = (channel or "hybrid").lower()  # type: ignore[arg-type]
    twilio = get_twilio_service()

    sms_sent = 0
    whatsapp_sent = 0
    tried_sms = False
    tried_whatsapp = False

    # 1) SMS kanalı
    if channel in {"sms", "hybrid"}:
        tried_sms = True
        try:
            sms_sent = await twilio.send_emergency_alert(numbers, message, use_whatsapp=False)
        except Exception as exc:  # pragma: no cover - ağ/hizmet hataları
            logger.error("Twilio SMS hibrit hatası: %s", exc)
            sms_sent = 0

    # 2) Twilio WhatsApp kanalı
    if channel in {"whatsapp", "hybrid"}:
        tried_whatsapp = True
        try:
            whatsapp_sent = await twilio.send_emergency_alert(numbers, message, use_whatsapp=True)
        except Exception as exc:  # pragma: no cover
            logger.error("Twilio WhatsApp hibrit hatası: %s", exc)
            whatsapp_sent = 0

    return {
        "sms_sent": sms_sent,
        "whatsapp_sent": whatsapp_sent,
        "tried_sms": tried_sms,
        "tried_whatsapp": tried_whatsapp,
    }


def send_hybrid_via_twilio_sync(
    phone_numbers: Iterable[str],
    message: str,
    channel: Channel = "hybrid",
) -> SOSHybridResult:
    """
    Celery gibi senkron ortamlarda kullanılmak için senkron wrapper.
    """
    return asyncio.run(send_hybrid_via_twilio(phone_numbers, message, channel=channel))

