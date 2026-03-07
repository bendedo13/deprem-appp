"""
AppSettings — Admin panelinden kontrol edilebilen uygulama ayarları.
Key-value tablosu: her satır bir ayar.

Varsayılan ayarlar (migration/init sırasında oluşturulur):
  earthquake_limit      → Deprem listesi limiti (varsayılan: 20)
  active_sources        → Aktif API kaynakları JSON dizisi (varsayılan: ["afad","kandilli","usgs","emsc"])
  simulation_enabled    → Simülasyon sistemi aktif mi (varsayılan: false)
  early_warning_enabled → Erken uyarı sistemi aktif mi (varsayılan: true)
"""

from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime
from sqlalchemy.sql import func

from app.database import Base


class AppSettings(Base):
    __tablename__ = "app_settings"

    # Ayar anahtarı — benzersiz (örn: "earthquake_limit")
    key: str = Column(String(100), primary_key=True)

    # Ayar değeri — JSON string ya da düz metin
    value: str = Column(Text, nullable=False)

    # Açıklama — admin panelinde gösterilir
    description: str = Column(String(500), nullable=True)

    # Son güncelleme zamanı
    updated_at: datetime = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    def __repr__(self) -> str:
        return f"<AppSettings key={self.key!r} value={self.value!r}>"


# Varsayılan ayarlar — DB init sırasında eklenir
DEFAULT_SETTINGS = [
    {
        "key": "earthquake_limit",
        "value": "20",
        "description": "Deprem listesinde gösterilecek maksimum kayıt sayısı (Türkiye filtresi için geçerli).",
    },
    {
        "key": "active_sources",
        "value": '["afad","kandilli","usgs","emsc"]',
        "description": "Aktif deprem API kaynakları. JSON dizisi: afad, kandilli, usgs, emsc.",
    },
    {
        "key": "simulation_enabled",
        "value": "false",
        "description": "Deprem simülasyon/test modunu etkinleştirir. Gerçek kullanıcılara uyarı gönderir.",
    },
    {
        "key": "early_warning_enabled",
        "value": "true",
        "description": "Cihaz sensörü tabanlı erken uyarı sistemini etkinleştirir.",
    },
]
