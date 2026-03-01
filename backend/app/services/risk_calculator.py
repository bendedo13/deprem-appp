"""
Bina ve konum bazlı deprem risk skoru hesaplama servisi.
Fay hattı mesafesi, zemin sınıfı ve bina yaşı faktörlerini birleştirir.
"""

import logging
import math
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)


# ── Türkiye Fay Hatları Veritabanı ───────────────────────────────────────────
# Kaynak: AFAD Diri Fay Haritası (2023)
FAULT_LINES: List[Dict] = [
    {
        "name": "Kuzey Anadolu Fay Hattı (Batı)",
        "lat": 40.7, "lon": 30.5,
        "magnitude_potential": 7.8,
        "activity": "very_high",
    },
    {
        "name": "Kuzey Anadolu Fay Hattı (Orta)",
        "lat": 40.5, "lon": 35.0,
        "magnitude_potential": 7.5,
        "activity": "very_high",
    },
    {
        "name": "Kuzey Anadolu Fay Hattı (Doğu)",
        "lat": 40.2, "lon": 39.5,
        "magnitude_potential": 7.3,
        "activity": "high",
    },
    {
        "name": "Doğu Anadolu Fay Hattı",
        "lat": 37.8, "lon": 38.5,
        "magnitude_potential": 7.6,
        "activity": "very_high",
    },
    {
        "name": "Doğu Anadolu Fay Hattı (Güney)",
        "lat": 37.2, "lon": 36.8,
        "magnitude_potential": 7.4,
        "activity": "high",
    },
    {
        "name": "Ege Graben Sistemi",
        "lat": 38.4, "lon": 27.1,
        "magnitude_potential": 7.0,
        "activity": "high",
    },
    {
        "name": "Büyük Menderes Fayı",
        "lat": 37.8, "lon": 28.5,
        "magnitude_potential": 6.8,
        "activity": "moderate",
    },
    {
        "name": "Gediz Fayı",
        "lat": 38.7, "lon": 28.9,
        "magnitude_potential": 6.5,
        "activity": "moderate",
    },
    {
        "name": "İzmir Fay Zonu",
        "lat": 38.4, "lon": 27.0,
        "magnitude_potential": 7.0,
        "activity": "high",
    },
    {
        "name": "Marmara Denizi Fayı",
        "lat": 40.8, "lon": 28.5,
        "magnitude_potential": 7.5,
        "activity": "very_high",
    },
    {
        "name": "Sultandağı Fayı",
        "lat": 38.5, "lon": 31.2,
        "magnitude_potential": 6.7,
        "activity": "moderate",
    },
    {
        "name": "Ecemiş Fayı",
        "lat": 37.9, "lon": 34.8,
        "magnitude_potential": 6.9,
        "activity": "moderate",
    },
]

# ── Zemin Sınıfı Katsayıları (TBDY 2018) ─────────────────────────────────────
SOIL_CLASS_FACTORS: Dict[str, Dict] = {
    "Z1": {
        "factor": 1.0,
        "description": "Sağlam kaya zemin",
        "vs30_range": ">760 m/s",
    },
    "Z2": {
        "factor": 1.3,
        "description": "Çok sıkı kum/çakıl veya sert kil",
        "vs30_range": "360-760 m/s",
    },
    "Z3": {
        "factor": 1.6,
        "description": "Orta sıkı kum/çakıl veya sert kil",
        "vs30_range": "180-360 m/s",
    },
    "Z4": {
        "factor": 2.0,
        "description": "Yumuşak zemin (sıvılaşma riski yüksek)",
        "vs30_range": "<180 m/s",
    },
    "UNKNOWN": {
        "factor": 1.4,
        "description": "Zemin sınıfı bilinmiyor (ortalama değer kullanıldı)",
        "vs30_range": "Bilinmiyor",
    },
}

# ── Bina Yaşı Risk Faktörleri ─────────────────────────────────────────────────
# Türkiye deprem yönetmelikleri: 1975, 1998, 2007, 2018
BUILDING_AGE_FACTORS: List[Tuple[int, float, str]] = [
    (1975, 2.5, "1975 öncesi — Deprem yönetmeliği yok"),
    (1998, 2.0, "1975-1998 arası — İlk yönetmelik dönemi"),
    (2007, 1.5, "1998-2007 arası — Geliştirilmiş yönetmelik"),
    (2018, 1.2, "2007-2018 arası — Modern yönetmelik"),
    (9999, 1.0, "2018 sonrası — TBDY 2018 (en güncel)"),
]


@dataclass
class RiskResult:
    """Risk hesaplama sonucu."""
    score: float
    level: str
    nearest_fault: str
    fault_distance_km: float
    soil_class: str
    building_year: int
    factors: Dict[str, float]
    recommendations: List[str]


class RiskCalculator:
    """
    Deprem risk skoru hesaplayıcı.

    Faktörler:
    1. Fay hattı mesafesi (0-4 puan)
    2. Zemin sınıfı (0-3 puan)
    3. Bina yaşı/yönetmelik dönemi (0-3 puan)

    Toplam: 0-10 puan (10 = en yüksek risk)
    """

    async def calculate(
        self,
        lat: float,
        lon: float,
        building_year: int = 2000,
        soil_class: str = "UNKNOWN",
    ) -> RiskResult:
        """
        Risk skorunu hesaplar.

        Args:
            lat: Enlem
            lon: Boylam
            building_year: Bina yapım yılı
            soil_class: Zemin sınıfı (Z1-Z4 veya UNKNOWN)

        Returns:
            RiskResult nesnesi
        """
        # 1. En yakın fay hattını bul
        nearest_fault, fault_distance_km = self._find_nearest_fault(lat, lon)

        # 2. Fay mesafesi skoru (0-4)
        fault_score = self._calculate_fault_score(fault_distance_km, nearest_fault)

        # 3. Zemin sınıfı skoru (0-3)
        soil_info = SOIL_CLASS_FACTORS.get(soil_class.upper(), SOIL_CLASS_FACTORS["UNKNOWN"])
        soil_score = self._calculate_soil_score(soil_info["factor"])

        # 4. Bina yaşı skoru (0-3)
        building_score = self._calculate_building_score(building_year)

        # 5. Toplam skor (0-10)
        total_score = min(10.0, fault_score + soil_score + building_score)
        total_score = round(total_score, 1)

        # 6. Risk seviyesi
        level = self._get_risk_level(total_score)

        # 7. Öneriler
        recommendations = self._generate_recommendations(
            score=total_score,
            fault_distance_km=fault_distance_km,
            soil_class=soil_class,
            building_year=building_year,
        )

        factors = {
            "fault_distance_score": round(fault_score, 2),
            "soil_class_score": round(soil_score, 2),
            "building_age_score": round(building_score, 2),
            "fault_distance_km": round(fault_distance_km, 1),
            "soil_factor": soil_info["factor"],
        }

        logger.info(
            "Risk hesaplandı: lat=%.4f, lon=%.4f, score=%.1f, level=%s, fault=%s (%.1f km)",
            lat, lon, total_score, level, nearest_fault, fault_distance_km
        )

        return RiskResult(
            score=total_score,
            level=level,
            nearest_fault=nearest_fault,
            fault_distance_km=round(fault_distance_km, 1),
            soil_class=soil_class.upper(),
            building_year=building_year,
            factors=factors,
            recommendations=recommendations,
        )

    def _find_nearest_fault(self, lat: float, lon: float) -> Tuple[str, float]:
        """En yakın fay hattını ve mesafesini bulur."""
        min_distance = float("inf")
        nearest_name = "Bilinmiyor"

        for fault in FAULT_LINES:
            distance = self._haversine(lat, lon, fault["lat"], fault["lon"])
            if distance < min_distance:
                min_distance = distance
                nearest_name = fault["name"]

        return nearest_name, min_distance

    def _calculate_fault_score(self, distance_km: float, fault_name: str) -> float:
        """
        Fay mesafesine göre risk skoru hesaplar (0-4).

        Mesafe eşikleri:
        - < 10 km: 4.0 (çok yüksek)
        - 10-25 km: 3.5
        - 25-50 km: 3.0
        - 50-100 km: 2.0
        - 100-200 km: 1.0
        - > 200 km: 0.5
        """
        # Fay aktivitesi çarpanı
        activity_multiplier = 1.0
        for fault in FAULT_LINES:
            if fault["name"] == fault_name:
                activity_map = {"very_high": 1.2, "high": 1.1, "moderate": 1.0, "low": 0.9}
                activity_multiplier = activity_map.get(fault.get("activity", "moderate"), 1.0)
                break

        if distance_km < 10:
            base_score = 4.0
        elif distance_km < 25:
            base_score = 3.5
        elif distance_km < 50:
            base_score = 3.0
        elif distance_km < 100:
            base_score = 2.0
        elif distance_km < 200:
            base_score = 1.0
        else:
            base_score = 0.5

        return min(4.0, base_score * activity_multiplier)

    def _calculate_soil_score(self, soil_factor: float) -> float:
        """Zemin faktörüne göre risk skoru hesaplar (0-3)."""
        # soil_factor: 1.0 (Z1) → 2.0 (Z4)
        # Normalize: (factor - 1.0) / 1.0 * 3.0
        return min(3.0, (soil_factor - 1.0) * 3.0)

    def _calculate_building_score(self, building_year: int) -> float:
        """Bina yapım yılına göre risk skoru hesaplar (0-3)."""
        for threshold_year, factor, _ in BUILDING_AGE_FACTORS:
            if building_year < threshold_year:
                # Normalize: (factor - 1.0) / 1.5 * 3.0
                return min(3.0, (factor - 1.0) / 1.5 * 3.0)
        return 0.0

    def _get_risk_level(self, score: float) -> str:
        """Skora göre risk seviyesi döner."""
        if score < 3.0:
            return "Düşük"
        elif score < 5.0:
            return "Orta"
        elif score < 7.5:
            return "Yüksek"
        else:
            return "Çok Yüksek"

    def _generate_recommendations(
        self,
        score: float,
        fault_distance_km: float,
        soil_class: str,
        building_year: int,
    ) -> List[str]:
        """Kişiselleştirilmiş öneriler üretir."""
        recommendations = []

        # Fay mesafesi önerileri
        if fault_distance_km < 10:
            recommendations.append(
                "⚠️ Aktif fay hattına çok yakınsınız (< 10 km). "
                "Acil deprem çantası hazırlayın ve tahliye planı yapın."
            )
        elif fault_distance_km < 50:
            recommendations.append(
                "📍 Aktif fay hattına yakınsınız. "
                "Deprem sigortası yaptırmanızı ve güvenli toplanma alanlarını belirlemenizi öneririz."
            )

        # Zemin önerileri
        if soil_class in ("Z3", "Z4"):
            recommendations.append(
                "🏗️ Zemin sınıfınız sıvılaşma riski taşıyor. "
                "Bina temel güçlendirmesi için uzman görüşü alın."
            )
        elif soil_class == "UNKNOWN":
            recommendations.append(
                "🔍 Zemin sınıfınız bilinmiyor. "
                "Yetkili bir zemin etüdü yaptırmanızı öneririz."
            )

        # Bina yaşı önerileri
        if building_year < 1975:
            recommendations.append(
                "🏚️ Binanız 1975 öncesi yapılmış — deprem yönetmeliği öncesi dönem. "
                "Acil olarak yapısal güçlendirme değerlendirmesi yaptırın."
            )
        elif building_year < 1998:
            recommendations.append(
                "🏠 Binanız 1975-1998 yönetmeliği döneminde yapılmış. "
                "Güçlendirme ihtiyacı için lisanslı bir mühendise danışın."
            )
        elif building_year < 2007:
            recommendations.append(
                "🏢 Binanız 1998-2007 yönetmeliği döneminde yapılmış. "
                "Periyodik bakım ve kontrol yaptırmanızı öneririz."
            )

        # Genel öneriler (her zaman)
        recommendations.extend([
            "📦 Deprem çantanızı hazırlayın: su, ilk yardım malzemeleri, el feneri, pil.",
            "📱 QuakeSense uygulamasında acil iletişim kişilerinizi güncel tutun.",
            "🚪 Evinizde güvenli alanları ve toplanma noktasını belirleyin.",
        ])

        # Yüksek risk önerileri
        if score >= 7.5:
            recommendations.insert(0,
                "🚨 RİSK SEVİYENİZ ÇOK YÜKSEK. "
                "Yetkili bir deprem mühendisinden acil yapısal değerlendirme talep edin."
            )

        return recommendations

    @staticmethod
    def _haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """
        İki koordinat arasındaki mesafeyi km cinsinden hesaplar (Haversine formülü).
        """
        R = 6371.0  # Dünya yarıçapı (km)
        phi1, phi2 = math.radians(lat1), math.radians(lat2)
        dphi = math.radians(lat2 - lat1)
        dlambda = math.radians(lon2 - lon1)

        a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
        return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))