"""
Deprem App — Kök entry point.
Tek gerçek uygulama backend/app/main.py'dedir.
Bu dosya sadece geriye dönük uyumluluk için re-export yapar.

Çalıştırma (her ikisi de aynı uygulamayı başlatır):
    uvicorn app.main:app --host 0.0.0.0 --port 8000
    uvicorn main:app --host 0.0.0.0 --port 8000
"""

from app.main import app  # noqa: F401
