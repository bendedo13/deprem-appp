"""
Periyodik deprem verisi çekme (Celery Beat). Mevcut mimari ile uyumlu stub.
"""

import logging
from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)


async def start_periodic_fetch() -> None:
    """Uygulama başlangıcında periyodik fetch'i tetikler (opsiyonel)."""
    logger.info("Periyodik deprem fetch hazır (Celery Beat).")


@celery_app.task
def fetch_earthquakes_task() -> None:
    """Celery Beat ile periyodik çalışacak deprem çekme görevi."""
    logger.debug("fetch_earthquakes_task çalıştı (stub).")
