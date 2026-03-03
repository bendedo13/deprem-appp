"""Rate limiting service for authentication endpoints.

Kota kontrol: Email veya IP başına maksimum başarısız deneme süresi.
Redis TTL: Otomatik sayaç sıfırlama.
"""

import logging
from typing import Optional
from redis.asyncio import Redis

logger = logging.getLogger(__name__)

MAX_FAILED_ATTEMPTS = 5
LOCKOUT_DURATION_SECONDS = 900  # 15 dakika


async def check_rate_limit(redis: Redis, key: str) -> tuple[bool, int]:
    """
    Rate limit kontrolü yap.

    Args:
        redis: Redis client
        key: Kota anahtarı (e.g. "auth_failed:{email}")

    Returns:
        (allowed: bool, remaining: int) - Eğer allowed=False, 429 dörmeli
    """
    if not redis:
        logger.warning("Redis yok, rate limiting atlandı")
        return True, MAX_FAILED_ATTEMPTS

    try:
        current = await redis.get(key)
        count = int(current) if current else 0

        if count >= MAX_FAILED_ATTEMPTS:
            remaining = 0
            logger.warning("Rate limit aşıldı: %s (count=%d)", key, count)
            return False, remaining

        remaining = MAX_FAILED_ATTEMPTS - count
        return True, remaining

    except Exception as e:
        logger.error("Rate limit kontrol hatası: %s", str(e))
        return True, MAX_FAILED_ATTEMPTS  # Hata durumunda geçiş yap


async def increment_failed_attempt(redis: Redis, key: str) -> None:
    """
    Başarısız giriş denemesini artır (TTL ile).

    Args:
        redis: Redis client
        key: Kota anahtarı
    """
    if not redis:
        return

    try:
        await redis.incr(key)
        await redis.expire(key, LOCKOUT_DURATION_SECONDS)
        logger.debug("Failed attempt kaydedildi: %s", key)

    except Exception as e:
        logger.error("Failed attempt kaydı hatası: %s", str(e))


async def clear_failed_attempts(redis: Redis, key: str) -> None:
    """
    Başarılı giriş sonrası sayacı temizle.

    Args:
        redis: Redis client
        key: Kota anahtarı
    """
    if not redis:
        return

    try:
        await redis.delete(key)
        logger.debug("Failed attempt sayacı temizlendi: %s", key)

    except Exception as e:
        logger.error("Failed attempt temizleme hatası: %s", str(e))
