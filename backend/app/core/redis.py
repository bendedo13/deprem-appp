"""
Redis bağlantı yönetimi. Shake clustering ve cache için kullanılır.
Timeout ve hata yönetimi production-ready.
"""

import logging
from typing import Optional

import redis.asyncio as aioredis
from redis.asyncio import Redis
from redis.exceptions import TimeoutError as RedisTimeoutError, RedisError

from app.config import settings

logger = logging.getLogger(__name__)

_redis: Optional[Redis] = None


async def get_redis() -> Redis:
    """Redis istemcisini döndürür. Bağlantı yoksa oluşturur."""
    global _redis
    if _redis is None:
        try:
            _redis = aioredis.from_url(
                settings.REDIS_URL,
                encoding="utf-8",
                decode_responses=True,
                socket_timeout=settings.REDIS_TIMEOUT_SECONDS,
                socket_connect_timeout=settings.REDIS_TIMEOUT_SECONDS,
            )
            await _redis.ping()
            logger.info("Redis bağlantısı kuruldu.")
        except (RedisTimeoutError, RedisError, OSError) as e:
            logger.error("Redis bağlantı hatası: %s", e)
            raise
    return _redis


async def close_redis() -> None:
    """Redis bağlantısını kapatır. Uygulama kapanışında çağrılır."""
    global _redis
    if _redis is not None:
        try:
            await _redis.aclose()
        except Exception as e:
            logger.warning("Redis kapatma uyarısı: %s", e)
        _redis = None
        logger.info("Redis bağlantısı kapatıldı.")
