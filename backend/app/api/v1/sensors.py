"""
Sensör (sarsıntı) sinyali endpoint'i.
Mobil cihazdan gelen shake verisini alır, Redis sliding window ile kümeleyip deprem doğrular.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException

from app.core.redis import get_redis
from app.schemas.sensors import ShakeReportRequest, ShakeReportResponse
from app.services.shake_cluster_service import ShakeClusterService
from redis.asyncio import Redis
from redis.exceptions import TimeoutError as RedisTimeoutError, RedisError

logger = logging.getLogger(__name__)

router = APIRouter()


async def get_shake_service(redis: Redis = Depends(get_redis)) -> ShakeClusterService:
    """ShakeClusterService'i Redis bağımlılığı ile döndürür."""
    return ShakeClusterService(redis)


@router.post(
    "/shake",
    response_model=ShakeReportResponse,
    summary="Sarsıntı sinyali gönder",
    description="Mobil cihaz ivmeölçer ile tespit edilen sarsıntıyı backend'e iletir. "
    "5 sn sliding window içinde aynı bölgede ≥10 cihaz sinyali gelirse deprem doğrulanır.",
)
async def report_shake(
    payload: ShakeReportRequest,
    service: ShakeClusterService = Depends(get_shake_service),
) -> ShakeReportResponse:
    """
    Mobil cihazdan tek bir sarsıntı sinyalini alır. Redis'e yazar, gerekirse deprem doğrular.
    Hata durumunda 503 veya 429 döner.
    """
    try:
        confirmed = await service.add_shake(
            device_id=payload.device_id,
            latitude=payload.latitude,
            longitude=payload.longitude,
            timestamp=payload.timestamp,
            intensity=payload.intensity,
        )

        if confirmed:
            # WebSocket ile tüm client'lara anlık bildir
            try:
                from app.api.websocket import manager
                earthquake_data = {
                    "source": "crowdsource",
                    "latitude": confirmed.latitude,
                    "longitude": confirmed.longitude,
                    "timestamp": confirmed.timestamp.isoformat(),
                    "device_count": confirmed.device_count,
                    "geohash": confirmed.geohash,
                }
                await manager.broadcast_earthquake(earthquake_data)
            except Exception as e:
                logger.warning("WebSocket broadcast hatası (deprem doğrulandı): %s", e)

            # Celery: acil kişilere bildirim + FCM push
            try:
                from app.tasks.notify_emergency_contacts import handle_confirmed_earthquake
                handle_confirmed_earthquake.delay(
                    latitude=confirmed.latitude,
                    longitude=confirmed.longitude,
                    geohash=confirmed.geohash,
                    timestamp_iso=confirmed.timestamp.isoformat(),
                    device_count=confirmed.device_count,
                )
            except Exception as e:
                logger.error("Celery task kuyruğa alma hatası: %s", e)

            return ShakeReportResponse(ok=True, message="received", confirmed=True)

        return ShakeReportResponse(ok=True, message="received", confirmed=False)

    except (RedisTimeoutError, RedisError) as e:
        logger.error("Redis hatası (report_shake): %s", e)
        raise HTTPException(status_code=503, detail="Servis geçici olarak kullanılamıyor. Lütfen tekrar deneyin.")
    except Exception as e:
        logger.exception("report_shake hatası: %s", e)
        raise HTTPException(status_code=500, detail="Beklenmeyen hata.")
