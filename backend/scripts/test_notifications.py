import sys
import os
from typing import TypedDict, List, Optional

# Path adjustment to import app
sys.path.append(os.path.join(os.getcwd(), "backend"))

try:
    from app.utils.geo import haversine_distance_km
except ImportError:
    # Fallback for linter or if path fails
    import math
    def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        R = 6371.0
        p1, p2 = math.radians(lat1), math.radians(lat2)
        dp, dl = math.radians(lat2 - lat1), math.radians(lon2 - lon1)
        a = math.sin(dp/2)**2 + math.cos(p1)*math.cos(p2)*math.sin(dl/2)**2
        return R * 2 * math.asin(math.sqrt(a))

class NotificationPref(TypedDict):
    min_magnitude: float
    radius_km: float
    is_enabled: bool

class MockUser(TypedDict):
    name: str
    lat: float
    lon: float
    pref: NotificationPref

MOCK_QUAKE = {
    "magnitude": 4.5,
    "latitude": 38.0,
    "longitude": 38.0,
    "location": "Test Malatya"
}

MOCK_USERS: List[MockUser] = [
    {
        "name": "User 1 (In range, Match Mag)",
        "lat": 38.1, "lon": 38.1,
        "pref": {"min_magnitude": 3.0, "radius_km": 100, "is_enabled": True}
    },
    {
        "name": "User 2 (Out of range)",
        "lat": 41.0, "lon": 29.0,
        "pref": {"min_magnitude": 3.0, "radius_km": 100, "is_enabled": True}
    },
    {
        "name": "User 3 (In range, High Mag pref - Filtered)",
        "lat": 38.05, "lon": 38.05,
        "pref": {"min_magnitude": 5.0, "radius_km": 500, "is_enabled": True}
    },
    {
        "name": "User 4 (Disabled Notifications)",
        "lat": 38.0, "lon": 38.0,
        "pref": {"min_magnitude": 2.0, "radius_km": 1000, "is_enabled": False}
    }
]

def test_filtering_logic():
    q_mag = float(MOCK_QUAKE["magnitude"])
    q_lat = float(MOCK_QUAKE["latitude"])
    q_lon = float(MOCK_QUAKE["longitude"])
    q_loc = str(MOCK_QUAKE["location"])

    print(f"--- 🔴 DEPREM TESTİ: M{q_mag} - {q_loc} ---")
    
    for user in MOCK_USERS:
        name = str(user["name"])
        pref = user["pref"]
        u_lat = float(user["lat"])
        u_lon = float(user["lon"])
        
        dist = haversine_distance_km(u_lat, u_lon, q_lat, q_lon)
        
        is_enabled = bool(pref["is_enabled"])
        min_mag = float(pref["min_magnitude"])
        radius = float(pref["radius_km"])

        should_notify = True
        reason = "OK"
        
        if not is_enabled:
            should_notify = False
            reason = "Bildirimler Kapalı"
        elif q_mag < min_mag:
            should_notify = False
            reason = f"Şiddet Düşük (Kullanıcı: {min_mag}, Deprem: {q_mag})"
        elif dist > radius:
            should_notify = False
            reason = f"Mesafe Uzak ({dist:.1f} km > {radius} km)"
            
        status = "✅ BİLDİRİM GİDER" if should_notify else f"❌ FİLTRELENDİ ({reason})"
        print(f"👤 {name.ljust(45)}: {status}")

if __name__ == "__main__":
    test_filtering_logic()
