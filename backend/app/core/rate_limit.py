"""
Rate limiting altyapısı — slowapi ile IP + Kullanıcı bazlı hız sınırı.

Twilio faturalarını korumak için SOS/SMS rotalarına sıkı limit uygulanır.
Redis backend varsa kullanır, yoksa in-memory'ye düşer.
"""

import logging
from typing import Optional

from fastapi import Request
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.config import settings

logger = logging.getLogger(__name__)


def _get_rate_limit_key(request: Request) -> str:
    """
    Önce JWT'den kullanıcı ID'si çıkar (user:<id>),
    bulamazsa IP adresine düşer.
    """
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        try:
            from app.services.auth import decode_token
            token = auth_header.split(" ", 1)[1]
            payload = decode_token(token)
            if payload and "sub" in payload:
                return f"user:{payload['sub']}"
        except Exception:
            pass
    return get_remote_address(request)


# Redis varsa storage_uri ata, yoksa in-memory
_storage_uri: Optional[str] = None
if settings.REDIS_URL:
    _redis_url = settings.REDIS_URL
    if _redis_url.startswith("redis://"):
        _storage_uri = f"redis://{_redis_url.split('redis://')[1]}"
    else:
        _storage_uri = _redis_url

limiter = Limiter(
    key_func=_get_rate_limit_key,
    storage_uri=_storage_uri,
    default_limits=[],
)
