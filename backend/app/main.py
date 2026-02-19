"""
Deprem App — FastAPI ana uygulama.
Tüm router'ları, middleware ve lifespan yönetir.

Çalıştırma: uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from app.config import settings
from app.database import init_db
from app.core.redis import get_redis, close_redis
from app.api.v1 import earthquakes, users, notifications, analytics, risk, sensors
from app.api.websocket import websocket_router
from app.tasks.fetch_earthquakes import start_periodic_fetch

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Uygulama başlangıç ve kapanış."""
    logger.info("Deprem App başlatılıyor...")
    await init_db()
    await start_periodic_fetch()
    logger.info("Uygulama hazır.")
    yield
    await close_redis()
    logger.info("Uygulama kapatıldı.")


app = FastAPI(
    title="Deprem App API",
    description="Türkiye deprem takip platformu API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS_LIST,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=1000)

app.include_router(earthquakes.router, prefix="/api/v1/earthquakes", tags=["Depremler"])
app.include_router(users.router, prefix="/api/v1/users", tags=["Kullanıcılar"])
app.include_router(notifications.router, prefix="/api/v1/notifications", tags=["Bildirimler"])
app.include_router(analytics.router, prefix="/api/v1/analytics", tags=["Analitik"])
app.include_router(risk.router, prefix="/api/v1/risk", tags=["Risk"])
app.include_router(sensors.router, prefix="/api/v1/sensors", tags=["Sensörler"])
app.include_router(websocket_router, tags=["WebSocket"])


@app.get("/health", tags=["Sistem"])
async def health_check():
    return {"status": "ok", "version": "1.0.0"}


@app.get("/", tags=["Sistem"])
async def root():
    return {"message": "Deprem App API", "docs": "/docs", "version": "1.0.0"}
