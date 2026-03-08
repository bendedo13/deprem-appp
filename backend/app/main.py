"""
Deprem App — FastAPI ana uygulama.
Tüm router'ları, middleware ve lifespan yönetir.

Çalıştırma: uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.core.redis import get_redis, close_redis
from app.api.v1 import earthquakes, users, notifications, analytics, risk, seismic, admin, sos, support, community
from app.api.websocket import websocket_router
from app.tasks.fetch_earthquakes import start_periodic_fetch

logger = logging.getLogger(__name__)

logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Uygulama başlangıç ve kapanış."""
    logger.info("Deprem App başlatılıyor...")
    await start_periodic_fetch()
    logger.info("Uygulama hazır.")
    yield
    await close_redis()
    logger.info("Uygulama kapatıldı.")


app = FastAPI(
    title="Deprem App API",
    description="Türkiye deprem takip platformu API",
    version="1.0.0",
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    lifespan=lifespan,
)

# CORS — wildcard + credentials birlikte kullanılamaz (HTTP spec).
# DEBUG modunda localhost origin'leri, production'da ALLOWED_ORIGINS_LIST kullanılır.
_debug_origins = ["http://localhost:3000", "http://localhost:5173", "http://localhost:8080"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_debug_origins if settings.DEBUG else settings.ALLOWED_ORIGINS_LIST,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
)
app.add_middleware(GZipMiddleware, minimum_size=1000)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error("Beklenmeyen hata: %s %s — %s", request.method, request.url.path, exc, exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Sunucu hatası. Lütfen daha sonra tekrar deneyin."},
    )


app.include_router(earthquakes.router, prefix="/api/v1/earthquakes", tags=["Depremler"])
app.include_router(users.router, prefix="/api/v1/users", tags=["Kullanıcılar"])
app.include_router(notifications.router, prefix="/api/v1/notifications", tags=["Bildirimler"])
app.include_router(analytics.router, prefix="/api/v1/analytics", tags=["Analitik"])
app.include_router(risk.router, prefix="/api/v1/risk", tags=["Risk"])
app.include_router(seismic.router, prefix="/api/v1/seismic", tags=["Seismic"])
app.include_router(admin.router, prefix="/api/v1/admin", tags=["Admin"])
app.include_router(sos.router, prefix="/api/v1/sos", tags=["S.O.S"])
app.include_router(support.router, prefix="/api/v1/support", tags=["Destek"])
app.include_router(community.router, prefix="/api/v1/community", tags=["Topluluk"])
app.include_router(websocket_router, tags=["WebSocket"])


@app.get("/health", tags=["Sistem"])
@app.get("/api/v1/health", tags=["Sistem"])
async def health_check():
    """Health check endpoint - hem /health hem /api/v1/health"""
    return {"status": "ok", "version": "1.0.0"}


@app.get("/", tags=["Sistem"])
async def root():
    return {"message": "Deprem App API", "docs": "/docs", "version": "1.0.0"}
