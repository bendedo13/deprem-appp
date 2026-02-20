"""
Celery periyodik deprem veri çekme görevi.
Her FETCH_INTERVAL_SECONDS saniyede bir çalışır (config'den okunur).
Yeni depremler DB'ye kaydedilir, WebSocket üzerinden broadcast edilir,
ve FCM push bildirimi gönderilir. Cache invalidate edilir.
"""

import asyncio
import logging
from typing import List

from app.config import settings
from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)


async def _run_fetch() -> int:
    """
    Asenkron fetch + DB kayıt + WebSocket broadcast + FCM push işlemi.

    Returns:
        Eklenen yeni deprem sayısı.
    """
    # Geç import — Celery worker import döngüsünden kaçınmak için
    from app.services.earthquake_fetcher import EarthquakeFetcherService, EarthquakeData
    from app.services.cache_manager import invalidate_earthquake_cache
    from app.services.fcm import send_earthquake_push_multicast
    from app.models.earthquake import Earthquake
    from app.models.user import User
    from app.database import SyncSessionLocal
    from app.core.redis import get_redis
    from app.api.websocket import manager as ws_manager
    from sqlalchemy import select

    async with EarthquakeFetcherService() as svc:
        quakes: List[EarthquakeData] = await svc.fetch_latest(hours=2)

    if not quakes:
        return 0

    new_quakes: List[EarthquakeData] = []
    with SyncSessionLocal() as session:
        for quake in quakes:
            db_id: str = quake.db_id
            exists = session.get(Earthquake, db_id)
            if exists:
                continue
            row = Earthquake(
                id=db_id,
                source=quake.source,
                magnitude=quake.magnitude,
                depth=quake.depth,
                latitude=quake.latitude,
                longitude=quake.longitude,
                location=quake.location,
                magnitude_type=quake.magnitude_type,
                occurred_at=quake.occurred_at,
            )
            session.add(row)
            new_quakes.append(quake)
        session.commit()

    if not new_quakes:
        return 0

    logger.info("💾 %d yeni deprem kaydedildi.", len(new_quakes))

    # Cache invalidate
    try:
        redis = await get_redis()
        await invalidate_earthquake_cache(redis)
    except Exception as exc:
        logger.warning("Cache invalidation başarısız: %s", exc)

    # FCM token'larını topla
    fcm_tokens: List[str] = []
    with SyncSessionLocal() as session:
        rows = session.execute(
            select(User.fcm_token).where(User.fcm_token.isnot(None))
        ).all()
        fcm_tokens = [str(row[0]) for row in rows]

    # WebSocket broadcast + FCM push
    for quake in new_quakes:
        quake_data: EarthquakeData = quake

        # WebSocket broadcast (tüm bağlı istemciler)
        await ws_manager.broadcast_earthquake({
            "id": quake_data.db_id,
            "source": quake_data.source,
            "magnitude": quake_data.magnitude,
            "depth": quake_data.depth,
            "latitude": quake_data.latitude,
            "longitude": quake_data.longitude,
            "location": quake_data.location,
            "occurred_at": quake_data.occurred_at.isoformat(),
        })

        # FCM push — sadece M >= 3.0 depremlerde bildirim gönder
        if quake_data.magnitude >= 3.0 and fcm_tokens:
            await send_earthquake_push_multicast(
                fcm_tokens=fcm_tokens,
                magnitude=quake_data.magnitude,
                location=quake_data.location,
                depth=quake_data.depth,
                occurred_at=quake_data.occurred_at.isoformat(),
            )

    return len(new_quakes)


@celery_app.task(bind=True, max_retries=3, default_retry_delay=30)
def fetch_earthquakes_task(self) -> dict:  # type: ignore[override]
    """
    Celery Beat ile periyodik çalışan deprem çekme görevi.
    Hata durumunda 3 kez 30 saniye arayla yeniden dener.
    """
    logger.info("▶️ fetch_earthquakes_task başladı.")
    try:
        count = asyncio.run(_run_fetch())
        return {"status": "ok", "new_earthquakes": count}
    except Exception as exc:
        logger.error("fetch_earthquakes_task hatası: %s", exc)
        raise self.retry(exc=exc)


async def start_periodic_fetch() -> None:
    """
    Uygulama başlangıcında Celery Beat'in task'ı alabildiğini loglar.
    Gerçek zamanlama celery_app beat_schedule üzerinden yönetilir.
    """
    logger.info(
        "Periyodik deprem fetch hazır (interval=%ds).",
        settings.FETCH_INTERVAL_SECONDS,
    )
