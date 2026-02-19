"""
Deprem Veri Çekici Servis
==========================
AFAD → Kandilli → USGS → EMSC sırasıyla dener.
Biri çökerse otomatik bir sonrakine geçer.

Önemli notlar:
- Her kaynak için ayrı parser metodu var
- Tüm kaynaklar EarthquakeData şemasına normalize edilir
- Hata durumunda logger.error() çağrılır, exception yutulmaz
"""

import logging
from datetime import datetime, timedelta
from typing import Optional

import httpx
from pydantic import BaseModel

from app.config import settings

logger = logging.getLogger(__name__)


class EarthquakeData(BaseModel):
    """Normalize edilmiş deprem verisi. Tüm kaynaklar bu formata dönüştürülür."""
    source_id: str           # Kaynaktaki orijinal ID
    source: str              # "afad", "kandilli", "usgs", "emsc"
    magnitude: float
    depth: float             # km cinsinden
    latitude: float
    longitude: float
    location: str            # "İstanbul" gibi okunabilir konum
    datetime: datetime
    magnitude_type: str = "ML"  # ML, Mw, vb.


class EarthquakeFetcher:
    """
    Çoklu kaynaklı deprem veri çekici.
    
    Kullanım:
        fetcher = EarthquakeFetcher()
        earthquakes = await fetcher.fetch_latest(hours=1)
    """

    def __init__(self):
        # HTTP client — connection pool ile performanslı
        self.client = httpx.AsyncClient(
            timeout=10.0,
            headers={"User-Agent": "DepremApp/1.0 (+https://depremapp.com)"}
        )

    async def fetch_latest(self, hours: int = 1) -> list[EarthquakeData]:
        """
        En güncel depremleri çeker. API öncelik sırasını uygular.
        
        Args:
            hours: Kaç saatlik veri çekilecek (varsayılan 1 saat)
            
        Returns:
            EarthquakeData listesi, boş liste döner hata durumunda
        """
        for source in settings.API_PRIORITY:
            try:
                earthquakes = await self._fetch_from_source(source, hours)
                if earthquakes:
                    logger.info(f"✅ {source.upper()} kaynağından {len(earthquakes)} deprem alındı")
                    return earthquakes
            except Exception as e:
                logger.error(f"❌ {source.upper()} başarısız: {e}. Sonraki kaynağa geçiliyor...")
                continue

        logger.error("🚨 TÜM KAYNAKLAR BAŞARISIZ! Boş liste döndürülüyor.")
        return []

    async def _fetch_from_source(self, source: str, hours: int) -> list[EarthquakeData]:
        """Belirli bir kaynaktan veri çeker."""
        fetch_methods = {
            "afad": self._fetch_afad,
            "kandilli": self._fetch_kandilli,
            "usgs": self._fetch_usgs,
            "emsc": self._fetch_emsc,
        }
        method = fetch_methods.get(source)
        if not method:
            raise ValueError(f"Bilinmeyen kaynak: {source}")
        return await method(hours)

    async def _fetch_afad(self, hours: int) -> list[EarthquakeData]:
        """AFAD resmi API'sinden veri çeker."""
        end_time = datetime.utcnow()
        start_time = end_time - timedelta(hours=hours)

        url = f"{settings.AFAD_API_URL}/event/filter"
        params = {
            "start": start_time.strftime("%Y-%m-%d %H:%M:%S"),
            "end": end_time.strftime("%Y-%m-%d %H:%M:%S"),
            "minmag": 1.0,
            "maxmag": 10.0,
            "minlat": 34.0,
            "maxlat": 43.0,
            "minlon": 25.0,
            "maxlon": 45.0,
            "format": "json",
            "limit": 200,
            "orderby": "timedesc",
        }

        response = await self.client.get(url, params=params)
        response.raise_for_status()
        data = response.json()

        return [
            EarthquakeData(
                source_id=str(eq["eventID"]),
                source="afad",
                magnitude=float(eq.get("magnitude", 0)),
                depth=float(eq.get("depth", 0)),
                latitude=float(eq["latitude"]),
                longitude=float(eq["longitude"]),
                location=eq.get("location", "Bilinmiyor"),
                datetime=datetime.fromisoformat(eq["date"]),
                magnitude_type=eq.get("type", "ML"),
            )
            for eq in data.get("result", [])
            if eq.get("magnitude")
        ]

    async def _fetch_kandilli(self, hours: int) -> list[EarthquakeData]:
        """Kandilli + AFAD birleşik topluluk API'sinden veri çeker."""
        url = f"{settings.KANDILLI_API_URL}/deprem/kandilli/live"
        params = {"limit": 200}

        response = await self.client.get(url, params=params)
        response.raise_for_status()
        data = response.json()

        results = []
        for eq in data.get("result", []):
            try:
                results.append(EarthquakeData(
                    source_id=eq["earthquake_id"],
                    source="kandilli",
                    magnitude=float(eq["mag"]),
                    depth=float(eq.get("depth", 0)),
                    latitude=float(eq["geojson"]["coordinates"][1]),
                    longitude=float(eq["geojson"]["coordinates"][0]),
                    location=eq.get("title", "Bilinmiyor"),
                    datetime=datetime.fromisoformat(eq["date_time"]),
                ))
            except (KeyError, ValueError) as e:
                logger.warning(f"Kandilli veri parse hatası: {e}")
                continue
        return results

    async def _fetch_usgs(self, hours: int) -> list[EarthquakeData]:
        """USGS API'sinden global deprem verisini çeker. Yedek kaynak."""
        # Türkiye bbox + global için farklı endpoint
        end_time = datetime.utcnow()
        start_time = end_time - timedelta(hours=hours)

        url = f"{settings.USGS_API_URL.replace('/v1.0', '')}/fdsnws/event/1/query"
        params = {
            "format": "geojson",
            "starttime": start_time.isoformat(),
            "endtime": end_time.isoformat(),
            "minmagnitude": 1.0,
            "minlatitude": 34.0,
            "maxlatitude": 43.0,
            "minlongitude": 25.0,
            "maxlongitude": 45.0,
            "orderby": "time",
            "limit": 200,
        }

        response = await self.client.get(url, params=params)
        response.raise_for_status()
        data = response.json()

        results = []
        for feature in data.get("features", []):
            try:
                props = feature["properties"]
                coords = feature["geometry"]["coordinates"]
                results.append(EarthquakeData(
                    source_id=feature["id"],
                    source="usgs",
                    magnitude=float(props["mag"]),
                    depth=float(coords[2]),
                    latitude=float(coords[1]),
                    longitude=float(coords[0]),
                    location=props.get("place", "Bilinmiyor"),
                    datetime=datetime.fromtimestamp(props["time"] / 1000),
                    magnitude_type=props.get("magType", "ML"),
                ))
            except (KeyError, TypeError) as e:
                logger.warning(f"USGS veri parse hatası: {e}")
                continue
        return results

    async def _fetch_emsc(self, hours: int) -> list[EarthquakeData]:
        """EMSC API'sinden Avrupa-Akdeniz bölgesi verisi çeker. Son yedek."""
        end_time = datetime.utcnow()
        start_time = end_time - timedelta(hours=hours)

        url = f"{settings.EMSC_API_URL}/query"
        params = {
            "limit": 200,
            "format": "json",
            "starttime": start_time.strftime("%Y-%m-%dT%H:%M:%S"),
            "endtime": end_time.strftime("%Y-%m-%dT%H:%M:%S"),
            "minlat": 34.0,
            "maxlat": 43.0,
            "minlon": 25.0,
            "maxlon": 45.0,
        }

        response = await self.client.get(url, params=params)
        response.raise_for_status()
        data = response.json()

        results = []
        for eq in data.get("earthquakes", []):
            try:
                results.append(EarthquakeData(
                    source_id=eq["unid"],
                    source="emsc",
                    magnitude=float(eq["mag"]),
                    depth=float(eq.get("depth", 0)),
                    latitude=float(eq["lat"]),
                    longitude=float(eq["lon"]),
                    location=eq.get("flynn_region", "Bilinmiyor"),
                    datetime=datetime.strptime(eq["time"], "%Y-%m-%dT%H:%M:%S.%fZ"),
                ))
            except (KeyError, ValueError) as e:
                logger.warning(f"EMSC veri parse hatası: {e}")
                continue
        return results

    async def close(self):
        """HTTP client'ı kapat. Uygulama kapanışında çağırılmalı."""
        await self.client.aclose()
