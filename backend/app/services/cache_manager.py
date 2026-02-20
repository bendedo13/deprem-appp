"""
Redis cache yöneticisi — deprem listesi için.
rules.md: deprem listesi cache TTL = 30s
"""

import json
import logging
from typing import List, Optional

from redis.asyncio import Redis

logger = logging.getLogger(__name__)

# rules.md: deprem listesi cache süresi
EARTHQUAKE_CACHE_TTL = 30  # saniye
EARTHQUAKE_CACHE_KEY_PREFIX = "eq:list"


def _build_cache_key(hours: int, min_magnitude: float, page: int, page_size: int) -> str:
    """Cache anahtarı oluşturur. Parametreler cache'i ayırt eder."""
    return f"{EARTHQUAKE_CACHE_KEY_PREFIX}:{hours}h:m{min_magnitude}:p{page}s{page_size}"


async def get_earthquake_cache(
    redis: Redis,
    hours: int,
    min_magnitude: float,
    page: int,
    page_size: int,
) -> Optional[dict]:
    """
    Redis'ten deprem listesini okur.

    Returns:
        Önbelleğe alınmış dict veya None (cache miss).
    """
    key = _build_cache_key(hours, min_magnitude, page, page_size)
    try:
        raw = await redis.get(key)
        if raw:
            logger.debug("Cache hit: %s", key)
            return json.loads(raw)
    except Exception as exc:
        # Cache hatası uygulamayı durdurmamalı
        logger.warning("Cache okuma hatası (key=%s): %s", key, exc)
    return None


async def set_earthquake_cache(
    redis: Redis,
    hours: int,
    min_magnitude: float,
    page: int,
    page_size: int,
    data: dict,
) -> None:
    """
    Deprem listesini Redis'e yazar.

    Args:
        data: JSON serileştirilebilir dict.
    """
    key = _build_cache_key(hours, min_magnitude, page, page_size)
    try:
        await redis.set(key, json.dumps(data, default=str), ex=EARTHQUAKE_CACHE_TTL)
        logger.debug("Cache yazıldı: %s (TTL=%ds)", key, EARTHQUAKE_CACHE_TTL)
    except Exception as exc:
        logger.warning("Cache yazma hatası (key=%s): %s", key, exc)


async def invalidate_earthquake_cache(redis: Redis) -> int:
    """
    Tüm deprem cache kayıtlarını siler.
    Yeni deprem kaydedildiğinde çağrılır.

    Returns:
        Silinen key sayısı.
    """
    try:
        keys = await redis.keys(f"{EARTHQUAKE_CACHE_KEY_PREFIX}:*")
        if keys:
            deleted = await redis.delete(*keys)
            logger.info("Cache temizlendi: %d key silindi.", deleted)
            return deleted
    except Exception as exc:
        logger.warning("Cache invalidation hatası: %s", exc)
    return 0
