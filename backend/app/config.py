"""
Uygulama ayarları. Tüm değerler ortam değişkeninden okunur.
Magic number kullanılmaz; sabitler burada tanımlanır.
"""

from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Ortam değişkenleri ve sabitler."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Uygulama
    DEBUG: bool = False
    SECRET_KEY: str = "change-me-min-32-chars"

    # Veritabanı
    DATABASE_URL: str = "postgresql+asyncpg://deprem_user:deprem_pass@localhost:5432/deprem_db"
    REDIS_URL: str = "redis://localhost:6379/0"

    # Redis timeout (saniye) — shake clustering için
    REDIS_TIMEOUT_SECONDS: float = 2.0

    # CORS
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://localhost:5173"
    @property
    def ALLOWED_ORIGINS_LIST(self) -> List[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",") if o.strip()]

    # Deprem API önceliği
    API_PRIORITY: List[str] = ["afad", "kandilli", "usgs", "emsc"]
    AFAD_API_URL: str = "https://deprem.afad.gov.tr/apiv2"
    KANDILLI_API_URL: str = "https://api.orhanaydogdu.com.tr"
    USGS_API_URL: str = "https://earthquake.usgs.gov"
    EMSC_API_URL: str = "https://www.seismicportal.eu/fdsnws/event/1"
    FETCH_INTERVAL_SECONDS: int = 30

    # ── Shake / deprem algılama sabitleri (EARTHQUAKE_DETECTION_ALGORITHM.md) ──
    SHAKE_WINDOW_SECONDS: int = 5
    SHAKE_WINDOW_TTL_SECONDS: int = 10
    SHAKE_MIN_DEVICES_TO_CONFIRM: int = 10
    SHAKE_CLUSTER_RADIUS_KM: float = 10.0
    SHAKE_GEOHASH_PRECISION: int = 5
    SHAKE_RATE_LIMIT_PER_DEVICE_SECONDS: int = 30


@lru_cache
def get_settings() -> Settings:
    """Ayarları singleton döndür (testlerde override edilebilir)."""
    return Settings()


settings = get_settings()
