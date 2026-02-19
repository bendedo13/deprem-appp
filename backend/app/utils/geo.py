"""
Coğrafi hesaplamalar: Haversine mesafe, GeoHash.
Kümeleme ve bölge eşlemesi için kullanılır.
"""

import math
from typing import Tuple

# GeoHash için base32 alfabesi (standart)
_GEOHASH_ALPHABET = "0123456789bcdefghjkmnpqrstuvwxyz"


def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    İki koordinat arasındaki mesafeyi km cinsinden hesaplar (Haversine).
    """
    R = 6371.0  # Dünya yarıçapı km
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


def geohash_encode(latitude: float, longitude: float, precision: int = 5) -> str:
    """
    Koordinatı GeoHash string'e çevirir. Aynı/komşu bölge karşılaştırması için.
    """
    lat_min, lat_max = -90.0, 90.0
    lon_min, lon_max = -180.0, 180.0
    result = []
    bits = 0
    ch = 0
    even = True

    while len(result) < precision:
        if even:
            mid = (lon_min + lon_max) / 2
            if longitude > mid:
                ch |= 1 << (4 - bits)
                lon_min = mid
            else:
                lon_max = mid
        else:
            mid = (lat_min + lat_max) / 2
            if latitude > mid:
                ch |= 1 << (4 - bits)
                lat_min = mid
            else:
                lat_max = mid
        even = not even
        bits += 1
        if bits == 5:
            result.append(_GEOHASH_ALPHABET[ch])
            bits = 0
            ch = 0
    return "".join(result)
