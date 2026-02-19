"""
Deprem App - FastAPI Ana Uygulama
=================================
Entry point. Tüm router'ları, middleware'leri ve başlangıç görevlerini yönetir.

Çalıştırma:
    uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.config import settings
from app.database import init_db
from app.api.v1 import earthquakes, users, notifications, analytics, risk
from app.api.websocket import websocket_router
from app.tasks.fetch_earthquakes import start_periodic_fetch

logger = logging.getLogger(__name__)

# Rate limiter
limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Uygulama başlangıç ve bitiş görevleri."""
    # Başlangıç
    logger.info("🚀 Deprem App başlatılıyor...")
    await init_db()
    await start_periodic_fetch()
    logger.info("✅ Uygulama hazır!")
    
    yield  # Uygulama burada çalışır
    
    # Kapanış
    logger.info("👋 Uygulama kapatılıyor...")


app = FastAPI(
    title="Deprem App API",
    description="Türkiye'nin en hızlı deprem takip platformu API'si",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# Middleware'ler
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=1000)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Router'ları ekle
app.include_router(earthquakes.router, prefix="/api/v1/earthquakes", tags=["Depremler"])
app.include_router(users.router, prefix="/api/v1/users", tags=["Kullanıcılar"])
app.include_router(notifications.router, prefix="/api/v1/notifications", tags=["Bildirimler"])
app.include_router(analytics.router, prefix="/api/v1/analytics", tags=["Analitik"])
app.include_router(risk.router, prefix="/api/v1/risk", tags=["Risk Analizi"])
app.include_router(websocket_router, tags=["WebSocket"])


@app.get("/health", tags=["Sistem"])
async def health_check():
    """Sistem sağlık kontrolü. Load balancer ve monitoring için."""
    return {"status": "ok", "version": "1.0.0"}


@app.get("/", tags=["Sistem"])
async def root():
    return {
        "message": "Deprem App API'ye hoş geldiniz",
        "docs": "/docs",
        "version": "1.0.0"
    }
