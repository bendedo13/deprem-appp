"""
Deprem App — FastAPI ana uygulama.
Tüm router'ları, middleware ve lifespan yönetir.

Çalıştırma: uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
"""

import logging
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from fastapi import HTTPException

from app.config import settings
from app.core.redis import get_redis, close_redis
from app.api.v1 import earthquakes, users, notifications, analytics, risk, seismic, admin, sos, subscription
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

# CORS — Mobil uygulama (React Native / Expo) origin göndermez,
# bu yüzden wildcard gereklidir. credentials=False ile güvenli.
# JWT token Authorization header ile gönderilir (cookie değil).
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
)
app.add_middleware(GZipMiddleware, minimum_size=1000)


def _error_body(detail: str, code: Optional[str] = None) -> dict:
    """Standart hata JSON: ok=False, detail."""
    return {"ok": False, "detail": detail, **({"code": code} if code else {})}


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Tüm HTTPException yanıtlarını standart JSON formata sokar."""
    return JSONResponse(
        status_code=exc.status_code,
        content=_error_body(detail=exc.detail if isinstance(exc.detail, str) else str(exc.detail)),
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Pydantic doğrulama hatalarını standart formatta döner."""
    errors = exc.errors()
    detail = "; ".join(
        f"{e.get('loc', ())[-1]}: {e.get('msg', '')}" for e in errors[:3]
    ) or "Geçersiz istek verisi."
    return JSONResponse(
        status_code=422,
        content=_error_body(detail=detail, code="validation_error"),
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error("Beklenmeyen hata: %s %s — %s", request.method, request.url.path, exc, exc_info=True)
    return JSONResponse(
        status_code=500,
        content=_error_body(detail="Sunucu hatası. Lütfen daha sonra tekrar deneyin."),
    )


app.include_router(earthquakes.router, prefix="/api/v1/earthquakes", tags=["Depremler"])
app.include_router(users.router, prefix="/api/v1/users", tags=["Kullanıcılar"])
app.include_router(notifications.router, prefix="/api/v1/notifications", tags=["Bildirimler"])
app.include_router(analytics.router, prefix="/api/v1/analytics", tags=["Analitik"])
app.include_router(risk.router, prefix="/api/v1/risk", tags=["Risk"])
app.include_router(seismic.router, prefix="/api/v1/seismic", tags=["Seismic"])
app.include_router(admin.router, prefix="/api/v1/admin", tags=["Admin"])
app.include_router(sos.router, prefix="/api/v1/sos", tags=["S.O.S"])
app.include_router(subscription.router, prefix="/api/v1/subscription", tags=["Abonelik"])
app.include_router(websocket_router, tags=["WebSocket"])


@app.get("/health", tags=["Sistem"])
@app.get("/api/v1/health", tags=["Sistem"])
async def health_check():
    """Health check endpoint - hem /health hem /api/v1/health"""
    return {"status": "ok", "version": "1.0.0"}


@app.get("/", tags=["Sistem"])
async def root():
    return {"message": "Deprem App API", "docs": "/docs", "version": "1.0.0"}
