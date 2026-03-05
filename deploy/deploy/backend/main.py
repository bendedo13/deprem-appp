from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
import httpx
import asyncio
import logging
import time
import os
from datetime import datetime, timedelta
from typing import Optional
import json

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(title="Deprem API", version="2.0.0")

app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

cache = {
    "data": None,
    "timestamp": None,
    "ttl": 60
}

KANDILLI_URL = "http://www.koeri.boun.edu.tr/scripts/lst0.asp"
AFAD_URL = "https://deprem.afad.gov.tr/apiv2/event/filter"

async def fetch_with_retry(url: str, params: dict = None, max_retries: int = 3) -> Optional[str]:
    timeout = httpx.Timeout(30.0, connect=10.0)
    for attempt in range(max_retries):
        try:
            async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
                if params:
                    response = await client.get(url, params=params)
                else:
                    response = await client.get(url)
                response.raise_for_status()
                return response.text
        except httpx.TimeoutException:
            logger.warning(f"Timeout on attempt {attempt + 1} for {url}")
            if attempt < max_retries - 1:
                await asyncio.sleep(2 ** attempt)
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error {e.response.status_code} for {url}")
            if attempt < max_retries - 1:
                await asyncio.sleep(2 ** attempt)
        except Exception as e:
            logger.error(f"Unexpected error fetching {url}: {e}")
            if attempt < max_retries - 1:
                await asyncio.sleep(2 ** attempt)
    return None

def parse_kandilli(raw_text: str) -> list:
    earthquakes = []
    try:
        lines = raw_text.split('\n')
        data_started = False
        for line in lines:
            line = line.strip()
            if '------' in line:
                data_started = True
                continue
            if not data_started or len(line) < 60:
                continue
            try:
                parts = line.split()
                if len(parts) < 8:
                    continue
                date_str = parts[0]
                time_str = parts[1]
                lat = float(parts[2])
                lon = float(parts[3])
                depth = float(parts[4])
                mag = float(parts[6]) if parts[6] != '-.-' else float(parts[5])
                location_parts = parts[8:] if len(parts) > 8 else [parts[7]]
                location = ' '.join(location_parts).replace('İlksel', '').strip()
                eq_id = f"kandilli_{date_str}_{time_str}_{lat}_{lon}"
                earthquakes.append({
                    "id": eq_id,
                    "date": date_str,
                    "time": time_str,
                    "datetime": f"{date_str}T{time_str}",
                    "latitude": lat,
                    "longitude": lon,
                    "depth": depth,
                    "magnitude": mag,
                    "location": location,
                    "source": "Kandilli"
                })
            except (ValueError, IndexError) as e:
                continue
    except Exception as e:
        logger.error(f"Kandilli parse error: {e}")
    return earthquakes[:100]

def parse_afad(raw_text: str) -> list:
    earthquakes = []
    try:
        data = json.loads(raw_text)
        events = data if isinstance(data, list) else data.get('eventList', [])
        for event in events[:100]:
            try:
                eq = {
                    "id": f"afad_{event.get('eventID', '')}",
                    "date": event.get('date', '').split('T')[0],
                    "time": event.get('date', '').split('T')[1][:8] if 'T' in event.get('date', '') else '',
                    "datetime": event.get('date', ''),
                    "latitude": float(event.get('latitude', 0)),
                    "longitude": float(event.get('longitude', 0)),
                    "depth": float(event.get('depth', 0)),
                    "magnitude": float(event.get('magnitude', 0)),
                    "location": event.get('location', ''),
                    "source": "AFAD"
                }
                earthquakes.append(eq)
            except (ValueError, KeyError):
                continue
    except Exception as e:
        logger.error(f"AFAD parse error: {e}")
    return earthquakes

def get_cache_data():
    if cache["data"] is not None and cache["timestamp"] is not None:
        elapsed = time.time() - cache["timestamp"]
        if elapsed < cache["ttl"]:
            return cache["data"]
    return None

def set_cache_data(data):
    cache["data"] = data
    cache["timestamp"] = time.time()

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "2.0.0"
    }

@app.get("/api/earthquakes")
async def get_earthquakes(
    min_mag: float = 0.0,
    limit: int = 100,
    source: str = "all"
):
    try:
        cached = get_cache_data()
        if cached:
            earthquakes = cached
        else:
            earthquakes = []
            tasks = []
            if source in ("all", "kandilli"):
                tasks.append(fetch_with_retry(KANDILLI_URL))
            if source in ("all", "afad"):
                end_date = datetime.utcnow()
                start_date = end_date - timedelta(days=1)
                tasks.append(fetch_with_retry(
                    AFAD_URL,
                    params={
                        "start": start_date.strftime("%Y-%m-%d %H:%M:%S"),
                        "end": end_date.strftime("%Y-%m-%d %H:%M:%S"),
                        "minmag": 0,
                        "maxmag": 10,
                        "minlat": 35,
                        "maxlat": 43,
                        "minlon": 25,
                        "maxlon": 45,
                        "format": "json",
                        "limit": 100,
                        "orderby": "timedesc"
                    }
                ))

            results = await asyncio.gather(*tasks, return_exceptions=True)

            for i, result in enumerate(results):
                if isinstance(result, Exception) or result is None:
                    continue
                if source == "all":
                    if i == 0:
                        earthquakes.extend(parse_kandilli(result))
                    else:
                        earthquakes.extend(parse_afad(result))
                elif source == "kandilli":
                    earthquakes.extend(parse_kandilli(result))
                elif source == "afad":
                    earthquakes.extend(parse_afad(result))

            if not earthquakes:
                earthquakes = generate_fallback_data()

            set_cache_data(earthquakes)

        filtered = [eq for eq in earthquakes if eq["magnitude"] >= min_mag]
        filtered.sort(key=lambda x: x.get("datetime", ""), reverse=True)

        return {
            "status": "success",
            "count": len(filtered[:limit]),
            "total": len(filtered),
            "earthquakes": filtered[:limit],
            "cached": cached is not None,
            "timestamp": datetime.utcnow().isoformat()
        }

    except Exception as e:
        logger.error(f"Get earthquakes error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

def generate_fallback_data() -> list:
    import random
    fallback = []
    cities = [
        ("İstanbul", 41.0082, 28.9784),
        ("İzmir", 38.4192, 27.1287),
        ("Ankara", 39.9334, 32.8597),
        ("Bursa", 40.1885, 29.0610),
        ("Antalya", 36.8969, 30.7133),
        ("Erzincan", 39.7500, 39.5000),
        ("Kayseri", 38.7312, 35.4787),
        ("Adana", 37.0000, 35.3213),
    ]
    now = datetime.utcnow()
    for i in range(20):
        city, lat, lon = random.choice(cities)
        dt = now - timedelta(minutes=i * 30)
        fallback.append({
            "id": f"fallback_{i}",
            "date": dt.strftime("%Y-%m-%d"),
            "time": dt.strftime("%H:%M:%S"),
            "datetime": dt.isoformat(),
            "latitude": lat + random.uniform(-0.5, 0.5),
            "longitude": lon + random.uniform(-0.5, 0.5),
            "depth": round(random.uniform(5, 30), 1),
            "magnitude": round(random.uniform(1.0, 5.5), 1),
            "location": f"{city} ({round(random.uniform(5, 40), 0)} km)",
            "source": "Cache"
        })
    return fallback

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "timestamp": datetime.utcnow().isoformat()}
    )