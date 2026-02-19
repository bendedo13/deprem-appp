"""
Celery uygulaması. Tüm task'lar bu app üzerinden tanımlanır.
"""

from celery import Celery
from app.config import settings

celery_app = Celery(
    "deprem_app",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["app.tasks.notify_emergency_contacts", "app.tasks.fetch_earthquakes"],
)
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Europe/Istanbul",
    enable_utc=True,
    task_routes={
        "app.tasks.notify_emergency_contacts.handle_confirmed_earthquake": {"queue": "notifications"},
    },
)
