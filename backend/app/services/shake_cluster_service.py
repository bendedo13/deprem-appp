"""
Sarsıntı sinyallerini Redis sliding window ile toplar ve deprem doğrulama mantığını uygular.
EARTHQUAKE_DETECTION_ALGORITHM.md: 5 sn pencere, aynı bölge (GeoHash), en az 10 cihaz.
"""

import logging
from dataclasses import dataclass
from datetime import datetime
from typing import Optional

from redis.asyncio import Redis
from redis.exceptions import TimeoutError as RedisTimeoutError, RedisError

from app.config import settings
from app.utils.geo import geohash_encode

logger = logging.getLogger(__name__)


@dataclass
class ConfirmedShakeEvent:
    """Doğrulanmış deprem olayı (kümeleme sonucu)."""

    geohash: str
    latitude: float
    longitude: float
    device_count: int
    window_start_ts: int
    timestamp: datetime


class ShakeClusterService:
    """
    Redis üzerinde 5 saniyelik sliding window ile sarsıntı sinyallerini kümeleyen servis.
    Aynı GeoHash bölgesinde en az MIN_DEVICES sinyal gelirse deprem doğrulanır.
    """

    KEY_PREFIX = "shakes"
    RATE_LIMIT_PREFIX = "shake_rl"
    CONFIRMED_PREFIX = "shake_confirmed"

    def __init__(self, redis: Redis):
        self._redis = redis
        self._window_sec = settings.SHAKE_WINDOW_SECONDS
        self._window_ttl = settings.SHAKE_WINDOW_TTL_SECONDS
        self._min_devices = settings.SHAKE_MIN_DEVICES_TO_CONFIRM
        self._geohash_precision = settings.SHAKE_GEOHASH_PRECISION
        self._radius_km = settings.SHAKE_CLUSTER_RADIUS_KM
        self._rate_limit_sec = settings.SHAKE_RATE_LIMIT_PER_DEVICE_SECONDS

    def _window_ts(self, ts: datetime) -> int:
        """Zaman damgasına göre pencere ID (sliding window bucket)."""
        return int(ts.timestamp() // self._window_sec) * self._window_sec

    def _key(self, geohash: str, window_ts: int) -> str:
        return f"{self.KEY_PREFIX}:{geohash}:{window_ts}"

    def _rate_limit_key(self, device_id: str) -> str:
        return f"{self.RATE_LIMIT_PREFIX}:{device_id}"

    def _confirmed_key(self, geohash: str, window_ts: int) -> str:
        return f"{self.CONFIRMED_PREFIX}:{geohash}:{window_ts}"

    async def add_shake(
        self,
        device_id: str,
        latitude: Optional[float],
        longitude: Optional[float],
        timestamp: datetime,
        intensity: Optional[float] = None,
    ) -> Optional[ConfirmedShakeEvent]:
        """
        Bir sarsıntı sinyalini Redis'e ekler. Aynı pencerede aynı bölgede
        yeterli cihaz varsa ConfirmedShakeEvent döner.

        Konum yoksa sinyal kaydedilmez (kümeleme için gerekli).
        Redis timeout/hata durumunda None döner, exception loglanır.
        """
        if latitude is None or longitude is None:
            logger.debug("Shake sinyali konum olmadan atlandı (kümeleme için gerekli)")
            return None

        try:
            # Rate limit: aynı cihaz çok sık göndermesin
            rl_key = self._rate_limit_key(device_id)
            if await self._redis.get(rl_key):
                logger.debug("Shake rate limit: device_id=%s", device_id[:16])
                return None
            await self._redis.setex(rl_key, self._rate_limit_sec, "1")

            geohash = geohash_encode(latitude, longitude, self._geohash_precision)
            window_ts = self._window_ts(timestamp)
            key = self._key(geohash, window_ts)

            pipe = self._redis.pipeline()
            pipe.sadd(key, device_id)
            pipe.expire(key, self._window_ttl)
            pipe.scard(key)
            results = await pipe.execute()

            unique_count = results[2]
            if unique_count >= self._min_devices:
                confirmed_key = self._confirmed_key(geohash, window_ts)
                # Sadece ilk doğrulamada tetikle (bir kez per bölge/pencere)
                if await self._redis.set(confirmed_key, "1", nx=True, ex=self._window_ttl):
                    return ConfirmedShakeEvent(
                        geohash=geohash,
                        latitude=latitude,
                        longitude=longitude,
                        device_count=unique_count,
                        window_start_ts=window_ts,
                        timestamp=timestamp,
                    )
            return None

        except (RedisTimeoutError, RedisError) as e:
            logger.error("Redis hatası (shake add): %s", e)
            raise
        except Exception as e:
            logger.exception("Shake ekleme hatası: %s", e)
            raise

    async def get_device_count_in_window(
        self, geohash: str, window_ts: int
    ) -> int:
        """Belirli bölge ve penceredeki benzersiz cihaz sayısını döner."""
        try:
            key = self._key(geohash, window_ts)
            return await self._redis.scard(key) or 0
        except (RedisTimeoutError, RedisError) as e:
            logger.error("Redis hatası (scard): %s", e)
            return 0
