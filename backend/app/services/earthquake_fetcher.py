"""
Deprem veri çekici servis.
AFAD → Kandilli → USGS → EMSC sırasıyla dener; biri çöküşe diğerine geçer.
Tüm kaynaklar EarthquakeData şemasına normalize edilir.
Türkiye sınırları içindeki depremler için İl/İlçe formatına dönüştürülür.
"""

import logging
import re
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Tuple

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


# ─── Türkiye İl Merkezi Koordinatları (reverse-geocode için) ─────────────────
# Her il için (lat, lon, il_adı) — en yakın ili bulmak için kullanılır.
_TURKEY_PROVINCES: List[Tuple[float, float, str]] = [
    (39.92, 32.85, "Ankara"), (41.01, 28.98, "İstanbul"), (38.42, 27.14, "İzmir"),
    (37.00, 35.32, "Adana"), (36.88, 30.71, "Antalya"), (40.18, 29.07, "Bursa"),
    (39.77, 30.52, "Eskişehir"), (38.73, 35.49, "Kayseri"), (37.87, 32.48, "Konya"),
    (40.66, 29.29, "Kocaeli"), (38.35, 38.31, "Malatya"), (37.58, 36.94, "Kahramanmaraş"),
    (37.75, 30.29, "Burdur"), (37.77, 29.09, "Denizli"), (38.68, 29.41, "Afyonkarahisar"),
    (41.29, 36.33, "Samsun"), (41.00, 40.52, "Trabzon"), (39.65, 27.89, "Balıkesir"),
    (40.19, 36.40, "Tokat"), (40.55, 36.71, "Amasya"), (40.35, 37.88, "Tokat"),
    (39.92, 41.28, "Erzurum"), (39.75, 37.01, "Sivas"), (38.74, 30.54, "Kütahya"),
    (37.07, 37.38, "Gaziantep"), (37.16, 28.36, "Muğla"), (40.77, 30.40, "Sakarya"),
    (40.39, 49.88, "Iğdır"), (39.23, 43.05, "Ağrı"), (38.39, 43.28, "Van"),
    (37.92, 40.22, "Diyarbakır"), (37.76, 38.28, "Adıyaman"), (39.14, 34.16, "Kırşehir"),
    (38.63, 34.72, "Nevşehir"), (40.60, 43.10, "Kars"), (41.20, 32.63, "Kastamonu"),
    (41.67, 26.56, "Edirne"), (41.18, 27.80, "Kırklareli"), (40.17, 26.40, "Çanakkale"),
    (38.94, 40.23, "Bingöl"), (38.50, 43.38, "Bitlis"), (38.37, 42.12, "Muş"),
    (40.31, 36.55, "Tokat"), (37.58, 43.73, "Şırnak"), (37.31, 40.74, "Mardin"),
    (37.92, 41.95, "Batman"), (37.05, 41.22, "Siirt"), (38.26, 40.54, "Elazığ"),
    (39.65, 39.92, "Erzincan"), (38.73, 39.50, "Tunceli"), (40.72, 39.67, "Gümüşhane"),
    (40.33, 39.72, "Bayburt"), (41.00, 39.72, "Trabzon"), (41.12, 40.93, "Rize"),
    (41.19, 41.82, "Artvin"), (40.92, 38.39, "Giresun"), (40.72, 37.37, "Ordu"),
    (41.57, 36.01, "Sinop"), (41.38, 33.78, "Çankırı"), (40.60, 33.61, "Çorum"),
    (41.73, 32.34, "Bartın"), (41.19, 32.62, "Kastamonu"), (41.43, 31.79, "Zonguldak"),
    (41.88, 27.11, "Kırklareli"), (41.67, 27.95, "Tekirdağ"), (40.65, 35.84, "Amasya"),
    (37.59, 36.17, "Osmaniye"), (36.80, 34.63, "Mersin"), (37.38, 33.23, "Karaman"),
    (38.02, 32.51, "Aksaray"), (38.73, 34.05, "Kırşehir"), (39.85, 33.52, "Kırıkkale"),
    (40.41, 30.97, "Bilecik"), (39.07, 30.69, "Kütahya"), (38.25, 34.03, "Niğde"),
    (40.43, 34.15, "Çankırı"), (40.05, 32.88, "Ankara"), (36.55, 32.00, "Antalya"),
    (39.42, 29.98, "Kütahya"), (37.57, 29.11, "Denizli"), (38.63, 27.43, "Manisa"),
    (38.02, 28.52, "Aydın"), (39.65, 28.11, "Balıkesir"), (36.40, 36.35, "Hatay"),
    (40.20, 40.78, "Erzurum"), (37.45, 44.05, "Hakkari"), (37.56, 42.46, "Şırnak"),
    (37.07, 36.25, "Gaziantep"), (37.91, 36.63, "Kahramanmaraş"),
    (36.88, 35.98, "Osmaniye"), (37.00, 35.86, "Adana"),
    (38.67, 39.22, "Tunceli"), (38.50, 39.49, "Elazığ"),
]

# EMSC/USGS İngilizce bölge adı → Türkçe il eşleştirmesi
_REGION_TR_MAP: dict[str, str] = {
    "WESTERN TURKEY": "Batı Türkiye",
    "EASTERN TURKEY": "Doğu Türkiye",
    "CENTRAL TURKEY": "İç Anadolu",
    "SOUTHERN TURKEY": "Güney Türkiye",
    "NORTHERN TURKEY": "Kuzey Türkiye",
    "AEGEAN SEA": "Ege Denizi",
    "EASTERN MEDITERRANEAN SEA": "Doğu Akdeniz",
    "SEA OF MARMARA": "Marmara Denizi",
    "BLACK SEA": "Karadeniz",
    "DODECANESE ISLANDS, GREECE": "Ege Denizi",
    "GREECE-TURKEY BORDER REGION": "Ege Bölgesi",
    "TURKEY-IRAN BORDER REGION": "Doğu Türkiye Sınırı",
    "TURKEY-IRAQ BORDER REGION": "Güneydoğu Türkiye",
    "TURKEY-SYRIA BORDER REGION": "Hatay/Gaziantep",
    "CRETE, GREECE": "Akdeniz",
}


def _find_nearest_province(lat: float, lon: float) -> Optional[str]:
    """Koordinata en yakın Türkiye ilini bulur (basit Öklid mesafesi)."""
    if not (34.0 <= lat <= 43.0 and 25.0 <= lon <= 45.0):
        return None
    best_dist = float("inf")
    best_name = None
    for plat, plon, name in _TURKEY_PROVINCES:
        dist = (plat - lat) ** 2 + (plon - lon) ** 2
        if dist < best_dist:
            best_dist = dist
            best_name = name
    return best_name


def _is_in_turkey(lat: float, lon: float) -> bool:
    """Koordinatın Türkiye sınırları içinde olup olmadığını kontrol eder."""
    return 35.5 <= lat <= 42.5 and 25.5 <= lon <= 44.8


def normalize_location(raw_location: str, lat: float, lon: float, source: str) -> str:
    """
    Deprem konum metnini normalize eder.
    - AFAD/Kandilli: Türkçe formatı düzelt (büyük harflerden İl, İlçe formatına)
    - USGS/EMSC: İngilizce bölge adını Türkçe İl adıyla değiştir
    """
    if not raw_location or raw_location in ("Bilinmiyor", "Unknown", ""):
        province = _find_nearest_province(lat, lon)
        return province or "Bilinmiyor"

    # AFAD konum formatını temizle: "BUCA-IZMIR" → "İzmir, Buca"
    if source in ("afad", "kandilli"):
        return _clean_afad_kandilli_location(raw_location)

    # USGS/EMSC: İngilizce → Türkçe dönüşümü
    if source in ("usgs", "emsc"):
        return _clean_international_location(raw_location, lat, lon)

    return raw_location


def _clean_afad_kandilli_location(raw: str) -> str:
    """
    AFAD/Kandilli lokasyon formatını temizler.
    Örnekler:
      "BUCA-IZMIR" → "İzmir, Buca"
      "KARABURUN AÇIKLARI (EGE DENİZİ)-İZMİR" → "İzmir, Karaburun Açıkları"
      "Ege Denizi" → "Ege Denizi"
    """
    text = raw.strip()

    # Parantez içindeki açıklamaları temizle: "(EGE DENİZİ)" → ""
    text = re.sub(r"\s*\([^)]*\)\s*", " ", text).strip()

    # "İLÇE-İL" formatını parse et
    if "-" in text:
        parts = text.rsplit("-", 1)
        if len(parts) == 2:
            ilce_raw = parts[0].strip()
            il_raw = parts[1].strip()
            il = il_raw.title()
            ilce = ilce_raw.title()

            # Türkçe karakter düzeltmeleri (title() bazılarını bozar)
            for wrong, right in [
                ("İstanbul", "İstanbul"), ("Izmir", "İzmir"), ("Içel", "Mersin"),
                ("Isparta", "Isparta"), ("Igdir", "Iğdır"),
            ]:
                il = il.replace(wrong, right)
                ilce = ilce.replace(wrong, right)

            # "Açiklari" → "Açıkları" gibi yaygın düzeltmeler
            ilce = ilce.replace("Açiklari", "Açıkları").replace("Açiklari", "Açıkları")
            ilce = ilce.replace("Körfezi", "Körfezi")

            return f"{il}, {ilce}"

    # Düz metin — title case uygula
    return text.title().replace("Ege Denizi", "Ege Denizi").replace("Akdeniz", "Akdeniz")


def _clean_international_location(raw: str, lat: float, lon: float) -> str:
    """
    USGS/EMSC İngilizce lokasyonunu Türkçe İl adıyla değiştirir.
    Örnekler:
      "24 km N of Bodrum, Turkey" → "Muğla, Bodrum"
      "WESTERN TURKEY" → "İzmir" (koordinata göre en yakın il)
    """
    upper = raw.upper().strip()

    # Bilinen bölge eşlemesi
    if upper in _REGION_TR_MAP:
        # Koordinattan en yakın ili bul
        province = _find_nearest_province(lat, lon)
        if province:
            return province
        return _REGION_TR_MAP[upper]

    # USGS formatı: "24 km NW of Bodrum, Turkey"
    usgs_match = re.match(
        r"^\d+\s*km\s+\w+\s+of\s+(.+?)(?:,\s*Turkey)?$",
        raw.strip(),
        re.IGNORECASE,
    )
    if usgs_match:
        place = usgs_match.group(1).strip()
        province = _find_nearest_province(lat, lon)
        if province:
            place_clean = place.title()
            if place_clean.lower() != province.lower():
                return f"{province}, {place_clean}"
            return province
        return place.title()

    # Türkiye sınırları içindeyse en yakın ili ekle
    if _is_in_turkey(lat, lon):
        province = _find_nearest_province(lat, lon)
        if province:
            return province

    return raw


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
                lat = float(eq["latitude"])
                lon = float(eq["longitude"])
                raw_loc = eq.get("location", "Bilinmiyor")
                results.append(EarthquakeData(
                    source_id=str(eq["eventID"]),
                    source="afad",
                    magnitude=float(eq["magnitude"]),
                    depth=float(eq.get("depth", 0)),
                    latitude=lat,
                    longitude=lon,
                    location=normalize_location(raw_loc, lat, lon, "afad"),
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
                lat = float(coords[1])
                lon = float(coords[0])
                raw_loc = eq.get("title", "Bilinmiyor")
                results.append(EarthquakeData(
                    source_id=eq["earthquake_id"],
                    source="kandilli",
                    magnitude=float(eq["mag"]),
                    depth=float(eq.get("depth", 0)),
                    latitude=lat,
                    longitude=lon,
                    location=normalize_location(raw_loc, lat, lon, "kandilli"),
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
                lat = float(coords[1])
                lon = float(coords[0])
                raw_loc = props.get("place", "Bilinmiyor")
                results.append(EarthquakeData(
                    source_id=feature["id"],
                    source="usgs",
                    magnitude=float(props["mag"]),
                    depth=float(coords[2]),
                    latitude=lat,
                    longitude=lon,
                    location=normalize_location(raw_loc, lat, lon, "usgs"),
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
                lat = float(eq["lat"])
                lon = float(eq["lon"])
                raw_loc = eq.get("flynn_region", "Bilinmiyor")
                results.append(EarthquakeData(
                    source_id=eq["unid"],
                    source="emsc",
                    magnitude=float(eq["mag"]),
                    depth=float(eq.get("depth", 0)),
                    latitude=lat,
                    longitude=lon,
                    location=normalize_location(raw_loc, lat, lon, "emsc"),
                    occurred_at=datetime.strptime(
                        eq["time"], "%Y-%m-%dT%H:%M:%S.%fZ"
                    ).replace(tzinfo=timezone.utc),
                ))
            except (KeyError, ValueError) as exc:
                logger.warning("EMSC veri parse hatası: %s", exc)
        return results
