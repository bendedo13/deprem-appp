"""
Celery periyodik deprem veri çekme görevi.
Her FETCH_INTERVAL_SECONDS saniyede bir çalışır (config'den okunur).
Yeni depremler DB'ye kaydedilir, cache invalidate edilir.
"""

import asyncio
import logging

from app.config import settings
from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)


async def _run_fetch() -> int:
    """
    Asenkron fetch + DB kayıt işlemi.

    Returns:
        Eklenen yeni deprem sayısı.
    """
    from app.services.earthquake_fetcher import EarthquakeFetcherService
    from app.services.cache_manager import invalidate_earthquake_cache
    from app.models.earthquake import Earthquake
    from app.database import SyncSessionLocal
    from app.core.redis import get_redis

    async with EarthquakeFetcherService() as svc:
        quakes = await svc.fetch_latest(hours=2)

    if not quakes:
        return 0

    new_count = 0
    with SyncSessionLocal() as session:
        for quake in quakes:
            db_id = quake.db_id
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
            new_count += 1
        session.commit()

    if new_count:
        logger.info("💾 %d yeni deprem kaydedildi.", new_count)
        try:
            redis = await get_redis()
            await invalidate_earthquake_cache(redis)
        except Exception as exc:
            logger.warning("Cache invalidation başarısız: %s", exc)
    return new_count


@celery_app.task(bind=True, max_retries=3, default_retry_delay=30)
def fetch_earthquakes_task(self) -> dict:
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
