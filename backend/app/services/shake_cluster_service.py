"""
Shake (sarsıntı) kümeleme servisi.
Redis sliding window ile cihaz sinyallerini kümeleyerek deprem doğrular.
EARTHQUAKE_DETECTION_ALGORITHM.md ile uyumlu.
"""

import logging
import math
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Optional

from redis.asyncio import Redis

from app.config import settings

logger = logging.getLogger(__name__)


@dataclass
class ConfirmedEarthquake:
    """Doğrulanmış deprem verisi."""
    latitude: float
    longitude: float
    geohash: str
    timestamp: datetime
    device_count: int


class ShakeClusterService:
    """
    Redis tabanlı sarsıntı kümeleme servisi.

    Algoritma:
    1. Her cihaz sinyali geohash ile bölgeye atanır
    2. Sliding window (5 sn) içinde aynı bölgeden ≥10 cihaz sinyali gelirse deprem doğrulanır
    3. Rate limiting: Aynı cihaz 30 sn içinde tekrar sinyal gönderemez
    """

    def __init__(self, redis: Redis) -> None:
        self.redis = redis
        self.window_seconds = settings.SHAKE_WINDOW_SECONDS
        self.window_ttl = settings.SHAKE_WINDOW_TTL_SECONDS
        self.min_devices = settings.SHAKE_MIN_DEVICES_TO_CONFIRM
        self.cluster_radius_km = settings.SHAKE_CLUSTER_RADIUS_KM
        self.geohash_precision = settings.SHAKE_GEOHASH_PRECISION
        self.rate_limit_seconds = settings.SHAKE_RATE_LIMIT_PER_DEVICE_SECONDS

    async def add_shake(
        self,
        device_id: str,
        latitude: Optional[float],
        longitude: Optional[float],
        timestamp: datetime,
        intensity: Optional[float] = None,
    ) -> Optional[ConfirmedEarthquake]:
        """
        Sarsıntı sinyalini işler.

        Args:
            device_id: Cihaz ID'si
            latitude: GPS enlem
            longitude: GPS boylam
            timestamp: Sinyal zamanı
            intensity: İvme büyüklüğü (m/s²)

        Returns:
            ConfirmedEarthquake: Deprem doğrulandıysa, None: Doğrulanmadıysa
        """
        # Konum yoksa işleme
        if latitude is None or longitude is None:
            logger.debug("Konum bilgisi eksik, sinyal atlandı: device_id=%s", device_id)
            return None

        # Rate limiting kontrolü
        rate_key = f"shake:rate:{device_id}"
        if await self.redis.exists(rate_key):
            logger.debug("Rate limit: device_id=%s", device_id)
            return None

        # Rate limit kaydet
        await self.redis.setex(rate_key, self.rate_limit_seconds, "1")

        # Geohash hesapla
        geohash = self._encode_geohash(latitude, longitude, self.geohash_precision)

        # Sliding window key
        now_ts = timestamp.timestamp()
        window_key = f"shake:window:{geohash}"

        # Eski sinyalleri temizle (sliding window)
        cutoff = now_ts - self.window_seconds
        await self.redis.zremrangebyscore(window_key, "-inf", cutoff)

        # Yeni sinyali ekle
        member = f"{device_id}:{now_ts}"
        await self.redis.zadd(window_key, {member: now_ts})
        await self.redis.expire(window_key, self.window_ttl)

        # Penceredeki cihaz sayısını kontrol et
        device_count = await self.redis.zcard(window_key)

        logger.debug(
            "Shake sinyali: device=%s, geohash=%s, count=%d/%d",
            device_id, geohash, device_count, self.min_devices
        )

        # Deprem doğrulama eşiği
        if device_count >= self.min_devices:
            # Merkez koordinatları hesapla
            center_lat, center_lon = self._geohash_center(geohash)

            confirmed = ConfirmedEarthquake(
                latitude=center_lat,
                longitude=center_lon,
                geohash=geohash,
                timestamp=datetime.now(tz=timezone.utc),
                device_count=int(device_count),
            )

            logger.warning(
                "🚨 DEPREM DOĞRULANDI: geohash=%s, devices=%d, lat=%.4f, lon=%.4f",
                geohash, device_count, center_lat, center_lon
            )

            # Doğrulama sonrası pencereyi sıfırla (tekrar tetiklemeyi önle)
            await self.redis.delete(window_key)

            return confirmed

        return None

    def _encode_geohash(self, lat: float, lon: float, precision: int) -> str:
        """
        Koordinatları geohash string'e dönüştürür.
        Basit implementasyon — production'da python-geohash kütüphanesi kullanılabilir.
        """
        try:
            import geohash2
            return geohash2.encode(lat, lon, precision)
        except ImportError:
            # Fallback: basit grid tabanlı hash
            return self._simple_grid_hash(lat, lon, precision)

    def _simple_grid_hash(self, lat: float, lon: float, precision: int) -> str:
        """
        Geohash kütüphanesi yoksa basit grid hash kullanır.
        precision=5 → ~5km x 5km hücre
        """
        # Grid boyutu precision'a göre
        grid_size = 1.0 / (2 ** (precision - 1))
        lat_grid = int(lat / grid_size)
        lon_grid = int(lon / grid_size)
        return f"g{lat_grid}_{lon_grid}"

    def _geohash_center(self, geohash: str) -> tuple[float, float]:
        """Geohash'in merkez koordinatlarını döner."""
        try:
            import geohash2
            lat, lon, _, _ = geohash2.decode_exactly(geohash)
            return lat, lon
        except (ImportError, Exception):
            # Fallback: geohash'ten koordinat çıkar
            if geohash.startswith("g") and "_" in geohash:
                parts = geohash[1:].split("_")
                if len(parts) == 2:
                    try:
                        grid_size = 1.0 / (2 ** (self.geohash_precision - 1))
                        lat = float(parts[0]) * grid_size + grid_size / 2
                        lon = float(parts[1]) * grid_size + grid_size / 2
                        return lat, lon
                    except ValueError:
                        pass
            return 39.0, 35.0  # Türkiye merkezi fallback