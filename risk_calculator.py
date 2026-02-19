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
"""

import logging
from dataclasses import dataclass
from typing import Optional

from app.utils.geo import haversine_distance

logger = logging.getLogger(__name__)


# Türkiye'nin ana aktif fay hatları (basitleştirilmiş koordinatlar)
# Gerçek projede MTA'nın tam fay hattı GeoJSON'u kullan
MAJOR_FAULT_LINES = [
    {
        "name": "Kuzey Anadolu Fay Hattı",
        "risk_multiplier": 1.5,
        "segments": [
            (41.0, 28.5), (40.8, 31.0), (40.5, 33.0),
            (40.0, 36.0), (39.5, 38.5), (39.0, 40.5),
        ]
    },
    {
        "name": "Doğu Anadolu Fay Hattı",
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
    score: float             # 0-10 arası skor
    level: str               # "Düşük", "Orta", "Yüksek", "Çok Yüksek"
    nearest_fault: str       # En yakın fay adı
    fault_distance_km: float
    soil_class: str
    building_year: int
    factors: dict            # Detaylı faktör bilgisi
    recommendations: list[str]


class RiskCalculator:
    """
    Deprem risk skoru hesaplayıcı.
    
    Kullanım:
        calculator = RiskCalculator()
        result = await calculator.calculate(lat=41.0, lon=29.0, building_year=1985)
    """

    async def calculate(
        self,
        lat: float,
        lon: float,
        building_year: int = 2000,
        soil_class: str = "UNKNOWN",
    ) -> RiskResult:
        """
        Risk skoru hesapla.
        
        Args:
            lat: Enlem
            lon: Boylam
            building_year: Bina yapım yılı
            soil_class: Zemin sınıfı (Z1-Z4)
            
        Returns:
            RiskResult objesi
        """
        # 1. Fay hattına mesafe hesapla
        fault_distance, nearest_fault = self._calculate_fault_distance(lat, lon)
        fault_risk = self._fault_distance_to_risk(fault_distance)
        
        # 2. Zemin riski
        soil_multiplier = SOIL_CLASS_MULTIPLIER.get(soil_class, 1.0)
        
        # 3. Bina yaşı riski
        year_multiplier = self._get_year_multiplier(building_year)
        
        # 4. Ağırlıklı skor hesapla (fay mesafesi en önemli)
        raw_score = fault_risk * 0.5 + (soil_multiplier * 2) * 0.3 + (year_multiplier * 2) * 0.2
        
        # 0-10 arasına normalize et
        score = min(10.0, max(0.0, raw_score))
        
        # Risk seviyesi belirle
        level = self._score_to_level(score)
        
        # Öneriler oluştur
        recommendations = self._generate_recommendations(score, building_year, fault_distance)
        
        return RiskResult(
            score=round(score, 1),
            level=level,
            nearest_fault=nearest_fault,
            fault_distance_km=round(fault_distance, 1),
            soil_class=soil_class,
            building_year=building_year,
            factors={
                "fault_risk": round(fault_risk, 2),
                "soil_multiplier": soil_multiplier,
                "year_multiplier": year_multiplier,
            },
            recommendations=recommendations,
        )

    def _calculate_fault_distance(self, lat: float, lon: float) -> tuple[float, str]:
        """En yakın fay hattına mesafeyi hesaplar."""
        min_distance = float("inf")
        nearest_fault_name = "Bilinmiyor"

        for fault in MAJOR_FAULT_LINES:
            for segment_lat, segment_lon in fault["segments"]:
                distance = haversine_distance(lat, lon, segment_lat, segment_lon)
                if distance < min_distance:
                    min_distance = distance
                    nearest_fault_name = fault["name"]

        return min_distance, nearest_fault_name

    def _fault_distance_to_risk(self, distance_km: float) -> float:
        """Fay mesafesini risk skoruna dönüştürür. Mesafe arttıkça risk azalır."""
        if distance_km < 10:
            return 9.5
        elif distance_km < 25:
            return 8.0
        elif distance_km < 50:
            return 6.5
        elif distance_km < 100:
            return 5.0
        elif distance_km < 200:
            return 3.5
        else:
            return 2.0

    def _get_year_multiplier(self, year: int) -> float:
        """Bina yapım yılına göre risk çarpanı döndürür."""
        for (start, end), multiplier in BUILDING_YEAR_RISK.items():
            if start <= year <= end:
                return multiplier
        return 1.0

    def _score_to_level(self, score: float) -> str:
        """Numerik skoru okunabilir seviyeye çevirir."""
        if score < 3:
            return "Düşük"
        elif score < 5:
            return "Orta"
        elif score < 7.5:
            return "Yüksek"
        else:
            return "Çok Yüksek"

    def _generate_recommendations(
        self, score: float, building_year: int, fault_distance_km: float
    ) -> list[str]:
        """Skora göre kişiselleştirilmiş öneriler üretir."""
        recommendations = []

        if building_year < 1999:
            recommendations.append(
                "⚠️ Binanız 1999 Marmara depremi öncesi inşa edilmiş. "
                "Deprem güçlendirmesi için uzman görüşü alın."
            )

        if fault_distance_km < 25:
            recommendations.append(
                f"🚨 {fault_distance_km:.0f} km mesafede aktif fay hattı var. "
                "DASK deprem sigortası yaptırmanızı şiddetle tavsiye ederiz."
            )

        if score >= 7:
            recommendations.append(
                "📋 Acil eylem planı oluşturun: toplanma noktası belirleyin, "
                "deprem çantası hazırlayın."
            )

        recommendations.append(
            "✅ DASK sigortası yapın — zorunlu ve ucuz (yıllık ~500-2000 TL)."
        )
        recommendations.append(
            "🎒 Deprem çantası hazırlayın: su, gıda, ilaç, fener, düdük."
        )

        return recommendations
