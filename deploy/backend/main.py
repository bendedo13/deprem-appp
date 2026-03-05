from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import httpx
import asyncio
from datetime import datetime, timedelta
import json
from typing import Optional
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Deprem API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

KANDILLI_URL = "http://www.koeri.boun.edu.tr/scripts/lst0.asp"
AFAD_URL = "https://deprem.afad.gov.tr/apiv2/event/filter"

cache = {
    "data": None,
    "timestamp": None,
    "ttl": 60
}

def parse_kandilli(text: str) -> list:
    earthquakes = []
    lines = text.split('\n')
    data_started = False
    
    for line in lines:
        line = line.strip()
        if '-----' in line:
            data_started = True
            continue
        
        if not data_started:
            continue
            
        if len(line) < 60:
            continue
        
        try:
            parts = line.split()
            if len(parts) < 9:
                continue
            
            date_str = parts[0]
            time_str = parts[1]
            
            try:
                lat = float(parts[2])
                lon = float(parts[3])
                depth = float(parts[4])
            except (ValueError, IndexError):
                continue
            
            mag = 0.0
            mag_index = -1
            for i in range(5, min(9, len(parts))):
                try:
                    val = float(parts[i])
                    if 0.0 <= val <= 10.0:
                        mag = val
                        mag_index = i
                        break
                except ValueError:
                    continue
            
            location_parts = []
            for i in range(mag_index + 1 if mag_index > 0 else 8, len(parts)):
                if parts[i] not in ['İlksel', 'Revize', 'İlkse']:
                    location_parts.append(parts[i])
            
            location = ' '.join(location_parts).strip() if location_parts else 'Bilinmiyor'
            
            try:
                dt = datetime.strptime(f"{date_str} {time_str}", "%Y.%m.%d %H:%M:%S")
                datetime_str = dt.isoformat()
            except ValueError:
                datetime_str = f"{date_str}T{time_str}"
            
            earthquakes.append({
                "id": f"kandilli_{date_str}_{time_str}_{lat}_{lon}",
                "datetime": datetime_str,
                "latitude": lat,
                "longitude": lon,
                "depth": depth,
                "magnitude": mag,
                "location": location,
                "source": "Kandilli"
            })
            
        except Exception as e:
            logger.debug(f"Satır parse hatası: {e} - {line}")
            continue
    
    return earthquakes[:500]

async def fetch_kandilli() -> list:
    try:
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8',
            }
            response = await client.get(KANDILLI_URL, headers=headers)
            response.raise_for_status()
            
            try:
                text = response.content.decode('windows-1254')
            except Exception:
                try:
                    text = response.content.decode('iso-8859-9')
                except Exception:
                    text = response.text
            
            earthquakes = parse_kandilli(text)
            logger.info(f"Kandilli'den {len(earthquakes)} deprem alındı")
            return earthquakes
    except Exception as e:
        logger.error(f"Kandilli fetch hatası: {e}")
        return []

async def fetch_afad() -> list:
    try:
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=7)
        
        params = {
            "start": start_date.strftime("%Y-%m-%d %H:%M:%S"),
            "end": end_date.strftime("%Y-%m-%d %H:%M:%S"),
            "minmag": -1,
            "maxmag": 10,
            "minlon": 25.0,
            "maxlon": 45.0,
            "minlat": 35.0,
            "maxlat": 43.0,
            "minDepth": -10,
            "maxDepth": 1000,
            "limit": 500,
            "offset": 0,
            "orderby": "timedesc"
        }
        
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(AFAD_URL, params=params)
            response.raise_for_status()
            data = response.json()
            
            earthquakes = []
            event_list = data if isinstance(data, list) else data.get('eventList', data.get('result', []))
            
            for item in event_list:
                try:
                    earthquakes.append({
                        "id": f"afad_{item.get('eventID', item.get('id', ''))}",
                        "datetime": item.get('date', item.get('eventDate', '')),
                        "latitude": float(item.get('latitude', item.get('lat', 0))),
                        "longitude": float(item.get('longitude', item.get('lon', 0))),
                        "depth": float(item.get('depth', 0)),
                        "magnitude": float(item.get('magnitude', item.get('mag', 0))),
                        "location": item.get('location', item.get('locationName', 'Bilinmiyor')),
                        "source": "AFAD"
                    })
                except Exception as e:
                    logger.debug(f"AFAD item parse hatası: {e}")
                    continue
            
            logger.info(f"AFAD'dan {len(earthquakes)} deprem alındı")
            return earthquakes
    except Exception as e:
        logger.error(f"AFAD fetch hatası: {e}")
        return []

async def get_earthquakes_data(source: str = "both") -> list:
    global cache
    
    now = datetime.utcnow()
    if (cache["data"] is not None and 
        cache["timestamp"] is not None and 
        (now - cache["timestamp"]).seconds < cache["ttl"]):
        logger.info("Cache'den veri döndürülüyor")
        
        if source == "kandilli":
            return [e for e in cache["data"] if e["source"] == "Kandilli"]
        elif source == "afad":
            return [e for e in cache["data"] if e["source"] == "AFAD"]
        return cache["data"]
    
    if source == "kandilli":
        data = await fetch_kandilli()
    elif source == "afad":
        data = await fetch_afad()
    else:
        kandilli_data, afad_data = await asyncio.gather(
            fetch_kandilli(),
            fetch_afad(),
            return_exceptions=True
        )
        
        data = []
        if isinstance(kandilli_data, list):
            data.extend(kandilli_data)
        if isinstance(afad_data, list):
            data.extend(afad_data)
        
        seen_ids = set()
        unique_data = []
        for item in data:
            if item["id"] not in seen_ids:
                seen_ids.add(item["id"])
                unique_data.append(item)
        data = unique_data
        
        data.sort(key=lambda x: x.get("datetime", ""), reverse=True)
        
        cache["data"] = data
        cache["timestamp"] = now
    
    return data

@app.get("/health")
async def health_check():
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}

@app.get("/")
async def root():
    return {"message": "Deprem API çalışıyor", "version": "1.0.0"}

@app.get("/earthquakes")
async def get_earthquakes(
    source: str = "both",
    minmag: Optional[float] = None,
    maxmag: Optional[float] = None,
    limit: int = 100,
    hours: Optional[int] = None
):
    try:
        data = await get_earthquakes_data(source)
        
        if minmag is not None:
            data = [e for e in data if e["magnitude"] >= minmag]
        
        if maxmag is not None:
            data = [e for e in data if e["magnitude"] <= maxmag]
        
        if hours is not None:
            cutoff = datetime.utcnow() - timedelta(hours=hours)
            filtered = []
            for e in data:
                try:
                    dt_str = e["datetime"].replace('Z', '+00:00')
                    if 'T' in dt_str:
                        dt = datetime.fromisoformat(dt_str.split('+')[0])
                    else:
                        dt = datetime.strptime(dt_str[:19], "%Y-%m-%d %H:%M:%S")
                    if dt >= cutoff:
                        filtered.append(e)
                except Exception:
                    filtered.append(e)
            data = filtered
        
        data = data[:limit]
        
        return {
            "count": len(data),
            "earthquakes": data,
            "updated_at": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Earthquakes endpoint hatası: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/earthquakes/latest")
async def get_latest(count: int = 10):
    try:
        data = await get_earthquakes_data()
        return {
            "count": min(count, len(data)),
            "earthquakes": data[:count],
            "updated_at": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Latest endpoint hatası: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/earthquakes/stats")
async def get_stats():
    try:
        data = await get_earthquakes_data()
        
        if not data:
            return {"total": 0, "message": "Veri bulunamadı"}
        
        mags = [e["magnitude"] for e in data if e["magnitude"] > 0]
        
        last_24h = 0
        now = datetime.utcnow()
        for e in data:
            try:
                dt_str = e["datetime"].replace('Z', '+00:00')
                if 'T' in dt_str:
                    dt = datetime.fromisoformat(dt_str.split('+')[0])
                else:
                    dt = datetime.strptime(dt_str[:19], "%Y-%m-%d %H:%M:%S")
                if (now - dt).total_seconds() < 86400:
                    last_24h += 1
            except Exception:
                pass
        
        return {
            "total": len(data),
            "last_24h": last_24h,
            "max_magnitude": max(mags) if mags else 0,
            "avg_magnitude": round(sum(mags) / len(mags), 2) if mags else 0,
            "sources": {
                "kandilli": len([e for e in data if e["source"] == "Kandilli"]),
                "afad": len([e for e in data if e["source"] == "AFAD"])
            },
            "updated_at": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Stats endpoint hatası: {e}")
        raise HTTPException(status_code=500, detail=str(e))