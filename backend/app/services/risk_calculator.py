"""
Risk Hesaplama Servisi
======================
Kullanıcının adresi ve bina bilgisine göre deprem risk skoru hesaplar.
Skor 0-10 arasında. 10 = en yüksek risk.

Hesaplama faktörleri:
1. Fay hattına mesafe (en ağırlıklı faktör)
2. Zemin sınıfı (Z1-Z4)
3. Bina yapım yılı (1975 öncesi en riskli)
4. Bölgesel sismik aktivite geçmişi

rules.md: async, type hints, logging, parameterized logic.
"""

import logging
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple

from app.utils.geo import haversine_distance_km

logger = logging.getLogger(__name__)


# Türkiye'nin ana aktif fay hatları (basitleştirilmiş koordinatlar)
# Gerçek projede MTA'nın tam fay hattı GeoJSON'u kullanılır.
MAJOR_FAULT_LINES = [
    {
        "name": "Kuzey Anadolu Fay Hattı (NAF)",
        "risk_multiplier": 1.5,
        "segments": [
            (41.0, 28.5), (40.8, 31.0), (40.5, 33.0),
            (40.0, 36.0), (39.5, 38.5), (39.0, 40.5),
        ]
    },
    {
        "name": "Doğu Anadolu Fay Hattı (DAF)",
        "risk_multiplier": 1.4,
        "segments": [
            (37.0, 37.0), (38.0, 39.0), (39.0, 41.0),
        ]
    },
    {
        "name": "Ege Graben Sistemi",
        "risk_multiplier": 1.2,
        "segments": [
            (38.5, 26.5), (38.0, 27.5), (37.5, 28.0),
        ]
    },
]

# Zemin sınıfı risk çarpanı
SOIL_CLASS_MULTIPLIER = {
    "Z1": 0.7,  # Kaya zemin — en iyi
    "Z2": 0.85,
    "Z3": 1.1,
    "Z4": 1.3,  # Yumuşak kil — en kötü
    "UNKNOWN": 1.0,
}

# Bina yaşına göre risk
BUILDING_YEAR_RISK = {
    (2007, 9999): 0.6,   # 2007 sonrası (yeni yönetmelik)
    (1999, 2006): 0.8,   # 1999-2006 arası
    (1975, 1998): 1.1,   # 1975-1998 arası
    (0, 1974): 1.5,      # 1975 öncesi — çok riskli
}


@dataclass
class RiskResult:
    """Risk hesaplama sonucu."""
    score: float             # 0-10 arası skor
    level: str               # "Düşük", "Orta", "Yüksek", "Çok Yüksek"
    nearest_fault: str       # En yakın fay adı
    fault_distance_km: float
    soil_class: str
    building_year: int
    factors: Dict[str, float] = field(default_factory=dict)
    recommendations: List[str] = field(default_factory=list)


class RiskCalculator:
    """
    Deprem risk skoru hesaplayıcı servis.
    """

    async def calculate(
        self,
        lat: float,
        lon: float,
        building_year: int = 2000,
        soil_class: str = "UNKNOWN",
    ) -> RiskResult:
        """
        Girdi parametrelerine göre risk skoru ve seviyesi hesaplar.
        """
        # 1. Fay hattına mesafe hesapla
        fault_distance, nearest_fault = self._calculate_fault_distance(lat, lon)
        fault_risk = self._fault_distance_to_risk(fault_distance)
        
        # 2. Zemin riski
        soil_multiplier = SOIL_CLASS_MULTIPLIER.get(soil_class, 1.0)
        
        # 3. Bina yaşı riski
        year_multiplier = self._get_year_multiplier(building_year)
        
        # 4. Ağırlıklı skor hesapla (fay mesafesi en önemli)
        # Fay (%50), Zemin (%30), Bina Yaşı (%20)
        raw_score = (fault_risk * 0.5) + (soil_multiplier * 2.5 * 0.3) + (year_multiplier * 2.5 * 0.2)
        
        # 0-10 arasına normalize et
        score = min(10.0, max(0.0, raw_score))
        
        # Risk seviyesi belirle
        level = self._score_to_level(score)
        
        # Öneriler oluştur
        recommendations = self._generate_recommendations(score, building_year, fault_distance)
        
        logger.info(
            "Risk hesaplandı: score=%.1f level=%s fault_dist=%.1fkm", 
            score, level, fault_distance
        )
        
        return RiskResult(
            score=float(round(score, 1)),
            level=level,
            nearest_fault=nearest_fault,
            fault_distance_km=float(round(fault_distance, 1)),
            soil_class=soil_class,
            building_year=building_year,
            factors={
                "fault_risk": float(round(fault_risk, 2)),
                "soil_multiplier": float(soil_multiplier),
                "year_multiplier": float(year_multiplier),
            },
            recommendations=recommendations,
        )

    def _calculate_fault_distance(self, lat: float, lon: float) -> Tuple[float, str]:
        """En yakın fay hattına mesafeyi hesaplar."""
        min_distance: float = 9999.0
        nearest_fault_name: str = "Bilinmiyor"

        for fault in MAJOR_FAULT_LINES:
            # type ignore because fault["segments"] is known to be List[Tuple[float, float]]
            segments = fault.get("segments", [])
            for s_lat, s_lon in segments:
                distance = haversine_distance_km(lat, lon, s_lat, s_lon)
                if distance < min_distance:
                    min_distance = float(distance)
                    nearest_fault_name = str(fault.get("name", "Bilinmiyor"))

        return min_distance, nearest_fault_name

    def _fault_distance_to_risk(self, distance_km: float) -> float:
        """Fay mesafesini 0-10 arası risk skoruna dönüştürür."""
        if distance_km < 5:
            return 10.0
        elif distance_km < 15:
            return 8.5
        elif distance_km < 30:
            return 7.0
        elif distance_km < 60:
            return 5.0
        elif distance_km < 120:
            return 3.0
        else:
            return 1.5

    def _get_year_multiplier(self, year: int) -> float:
        """Bina yapım yılına göre risk çarpanı döndürür."""
        for (start, end), multiplier in BUILDING_YEAR_RISK.items():
            if start <= year <= end:
                return multiplier
        return 1.0

    def _score_to_level(self, score: float) -> str:
        """Numerik skoru seviye ismine çevirir."""
        if score < 3.5:
            return "Düşük"
        elif score < 6.0:
            return "Orta"
        elif score < 8.0:
            return "Yüksek"
        else:
            return "Çok Yüksek"

    def _generate_recommendations(
        self, score: float, building_year: int, fault_distance_km: float
    ) -> List[str]:
        """Sonuca göre kullanıcıya özel tavsiyeler üretir."""
        recommendations = []

        if building_year < 1999:
            recommendations.append(
                "⚠️ Binanız 1999 Marmara depremi öncesi inşa edilmiş. "
                "Deprem dayanıklılık testi yaptırmanızı öneririz."
            )

        if fault_distance_km < 30:
            recommendations.append(
                f"🚨 Yaklaşık {fault_distance_km:.0f} km mesafede aktif fay hattı bulunmaktadır. "
                "DASK sigortanızın güncelliğini kontrol edin."
            )

        if score >= 7.5:
            recommendations.append(
                "📋 Acil durum çantası hazırlayın ve aile içi deprem tatbikatı yapın."
            )
        
        recommendations.append("🏠 Bina taşıyıcı kolonlarında çatlak olup olmadığını periyodik kontrol edin.")
        recommendations.append("🎒 Deprem çantası içeriğini her 6 ayda bir güncelleyin (su, gıda, pil).")

        return recommendations
