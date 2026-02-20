"""
Deprem veri çekici servis.
AFAD → Kandilli → USGS → EMSC sırasıyla dener; biri çöküşe diğerine geçer.
Tüm kaynaklar EarthquakeData şemasına normalize edilir.
"""

import logging
from datetime import datetime, timedelta, timezone
from typing import List, Optional

import httpx
from pydantic import BaseModel

from app.config import settings

logger = logging.getLogger(__name__)

# Türkiye coğrafi sınırları — config'e taşınabilir
_TUR_BBOX = {
    "minlat": 34.0,
    "maxlat": 43.0,
    "minlon": 25.0,
    "maxlon": 45.0,
}


class EarthquakeData(BaseModel):
    """
    Normalize edilmiş deprem verisi.
    Tüm API kaynakları bu formata dönüştürülür.
    """

    source_id: str
    source: str
    magnitude: float
    depth: float
    latitude: float
    longitude: float
    location: str
    occurred_at: datetime
    magnitude_type: str = "ML"

    @property
    def db_id(self) -> str:
        """Veritabanı birincil anahtarı: <source>-<source_id>."""
        return f"{self.source}-{self.source_id}"


class EarthquakeFetcherService:
    """
    Çoklu kaynaklı deprem veri çekici.

    Kullanım:
        async with EarthquakeFetcherService() as svc:
            quakes = await svc.fetch_latest(hours=1)
    """

    def __init__(self) -> None:
        self._client: Optional[httpx.AsyncClient] = None

    async def __aenter__(self) -> "EarthquakeFetcherService":
        self._client = httpx.AsyncClient(
            timeout=10.0,
            headers={"User-Agent": "DepremApp/1.0"},
        )
        return self

    async def __aexit__(self, *_) -> None:
        if self._client:
            await self._client.aclose()

    @property
    def client(self) -> httpx.AsyncClient:
        if self._client is None:
            raise RuntimeError("EarthquakeFetcherService context manager dışında kullanıldı.")
        return self._client

    async def fetch_latest(self, hours: int = 1) -> List[EarthquakeData]:
        """
        En güncel depremleri çeker. Kaynak önceliği: AFAD → Kandilli → USGS → EMSC.

        Args:
            hours: Kaç saatlik veri çekilecek (varsayılan 1 saat).

        Returns:
            EarthquakeData listesi; hata durumunda boş liste.
        """
        for source in settings.API_PRIORITY:
            try:
                results = await self._fetch_from_source(source, hours)
                if results:
                    logger.info("✅ %s: %d deprem alındı.", source.upper(), len(results))
                    return results
                logger.warning("⚠️ %s: Veri boş döndü.", source.upper())
            except Exception as exc:
                logger.error("❌ %s başarısız: %s. Sonraki kaynağa geçiliyor.", source.upper(), exc)

        logger.error("🚨 Tüm kaynaklar başarısız! Boş liste döndürülüyor.")
        return []

    async def _fetch_from_source(self, source: str, hours: int) -> List[EarthquakeData]:
        """Belirtilen kaynaktan veri çeker."""
        fetch_map = {
            "afad": self._fetch_afad,
            "kandilli": self._fetch_kandilli,
            "usgs": self._fetch_usgs,
            "emsc": self._fetch_emsc,
        }
        handler = fetch_map.get(source)
        if handler is None:
            raise ValueError(f"Bilinmeyen kaynak: {source}")
        return await handler(hours)

    async def _fetch_afad(self, hours: int) -> List[EarthquakeData]:
        """AFAD resmi API'sinden Türkiye deprem verisi çeker."""
        now = datetime.now(tz=timezone.utc)
        start = now - timedelta(hours=hours)
        url = f"{settings.AFAD_API_URL}/event/filter"
        params = {
            "start": start.strftime("%Y-%m-%d %H:%M:%S"),
            "end": now.strftime("%Y-%m-%d %H:%M:%S"),
            "minmag": 1.0,
            "maxmag": 10.0,
            **_TUR_BBOX,
            "format": "json",
            "limit": 200,
            "orderby": "timedesc",
        }
        resp = await self.client.get(url, params=params)
        resp.raise_for_status()
        data = resp.json()
        results: List[EarthquakeData] = []
        for eq in data.get("result", []):
            try:
                results.append(EarthquakeData(
                    source_id=str(eq["eventID"]),
                    source="afad",
                    magnitude=float(eq["magnitude"]),
                    depth=float(eq.get("depth", 0)),
                    latitude=float(eq["latitude"]),
                    longitude=float(eq["longitude"]),
                    location=eq.get("location", "Bilinmiyor"),
                    occurred_at=datetime.fromisoformat(eq["date"]).replace(tzinfo=timezone.utc),
                    magnitude_type=eq.get("type", "ML"),
                ))
            except (KeyError, ValueError) as exc:
                logger.warning("AFAD veri parse hatası: %s", exc)
        return results

    async def _fetch_kandilli(self, hours: int) -> List[EarthquakeData]:
        """Kandilli topluluk API'sinden veri çeker."""
        url = f"{settings.KANDILLI_API_URL}/deprem/kandilli/live"
        resp = await self.client.get(url, params={"limit": 200})
        resp.raise_for_status()
        data = resp.json()
        results: List[EarthquakeData] = []
        for eq in data.get("result", []):
            try:
                coords = eq["geojson"]["coordinates"]
                results.append(EarthquakeData(
                    source_id=eq["earthquake_id"],
                    source="kandilli",
                    magnitude=float(eq["mag"]),
                    depth=float(eq.get("depth", 0)),
                    latitude=float(coords[1]),
                    longitude=float(coords[0]),
                    location=eq.get("title", "Bilinmiyor"),
                    occurred_at=datetime.fromisoformat(eq["date_time"]).replace(tzinfo=timezone.utc),
                ))
            except (KeyError, ValueError) as exc:
                logger.warning("Kandilli veri parse hatası: %s", exc)
        return results

    async def _fetch_usgs(self, hours: int) -> List[EarthquakeData]:
        """USGS FDSN API'sinden Türkiye bölgesi deprem verisi çeker."""
        now = datetime.now(tz=timezone.utc)
        start = now - timedelta(hours=hours)
        url = f"{settings.USGS_API_URL}/fdsnws/event/1/query"
        params = {
            "format": "geojson",
            "starttime": start.isoformat(),
            "endtime": now.isoformat(),
            "minmagnitude": 1.0,
            **{f"min{k}": v for k, v in [("latitude", _TUR_BBOX["minlat"]),
                                          ("longitude", _TUR_BBOX["minlon"])]},
            **{f"max{k}": v for k, v in [("latitude", _TUR_BBOX["maxlat"]),
                                          ("longitude", _TUR_BBOX["maxlon"])]},
            "orderby": "time",
            "limit": 200,
        }
        resp = await self.client.get(url, params=params)
        resp.raise_for_status()
        data = resp.json()
        results: List[EarthquakeData] = []
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
                    occurred_at=datetime.fromtimestamp(
                        props["time"] / 1000, tz=timezone.utc
                    ),
                    magnitude_type=props.get("magType", "ML"),
                ))
            except (KeyError, TypeError, ValueError) as exc:
                logger.warning("USGS veri parse hatası: %s", exc)
        return results

    async def _fetch_emsc(self, hours: int) -> List[EarthquakeData]:
        """EMSC API'sinden Avrupa-Akdeniz bölgesi deprem verisi çeker."""
        now = datetime.now(tz=timezone.utc)
        start = now - timedelta(hours=hours)
        url = f"{settings.EMSC_API_URL}/query"
        params = {
            "limit": 200,
            "format": "json",
            "starttime": start.strftime("%Y-%m-%dT%H:%M:%S"),
            "endtime": now.strftime("%Y-%m-%dT%H:%M:%S"),
            "minlat": _TUR_BBOX["minlat"],
            "maxlat": _TUR_BBOX["maxlat"],
            "minlon": _TUR_BBOX["minlon"],
            "maxlon": _TUR_BBOX["maxlon"],
        }
        resp = await self.client.get(url, params=params)
        resp.raise_for_status()
        data = resp.json()
        results: List[EarthquakeData] = []
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
                    occurred_at=datetime.strptime(
                        eq["time"], "%Y-%m-%dT%H:%M:%S.%fZ"
                    ).replace(tzinfo=timezone.utc),
                ))
            except (KeyError, ValueError) as exc:
                logger.warning("EMSC veri parse hatası: %s", exc)
        return results
