"""
S.O.S ses dosyalarını saklama ve erişim servisi.
Dosyalar organize directory structure'da saklanır.
"""

import logging
import shutil
from datetime import datetime
from pathlib import Path
from typing import Optional

from app.config import settings

logger = logging.getLogger(__name__)


class AudioStorageError(Exception):
    """Audio storage hatası."""
    pass


class AudioStorage:
    """S.O.S audio file storage manager."""

    def __init__(self):
        self.base_path = Path(settings.SOS_AUDIO_STORAGE_PATH)
        self.base_url = settings.SOS_AUDIO_BASE_URL

        # Base directory'yi oluştur
        try:
            self.base_path.mkdir(parents=True, exist_ok=True)
            logger.info("Audio storage base path: %s", self.base_path)
        except Exception as exc:
            logger.error("Audio storage base path oluşturulamadı: %s", exc)

    def save_audio(
        self,
        audio_path: str,
        user_id: int,
        timestamp: str
    ) -> tuple[str, str]:
        """
        Ses dosyasını organize directory structure'da saklar.

        Args:
            audio_path: Geçici ses dosyası yolu
            user_id: Kullanıcı ID
            timestamp: ISO 8601 format timestamp

        Returns:
            Tuple[audio_url, audio_filename]

        Raises:
            AudioStorageError: Dosya kaydedilemezse
        """
        try:
            # Parse timestamp
            dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))

            # Create directory structure: /sos_audio/2024/01/15/
            dir_path = self.base_path / str(dt.year) / f"{dt.month:02d}" / f"{dt.day:02d}"
            dir_path.mkdir(parents=True, exist_ok=True)

            # Generate filename: sos_user123_20240115_143022.m4a
            ext = Path(audio_path).suffix
            filename = f"sos_user{user_id}_{dt.strftime('%Y%m%d_%H%M%S')}{ext}"

            # Copy file to storage
            dest_path = dir_path / filename
            shutil.copy(audio_path, dest_path)

            # Generate URL
            relative_path = f"{dt.year}/{dt.month:02d}/{dt.day:02d}/{filename}"
            audio_url = f"{self.base_url}/{relative_path}"

            logger.info("Audio saved: %s → %s", filename, dest_path)
            return audio_url, filename

        except Exception as exc:
            logger.error("Audio save hatası: %s", exc)
            raise AudioStorageError(f"Failed to save audio: {exc}")

    def get_audio_path(self, audio_filename: str, created_at: datetime) -> Optional[Path]:
        """
        Audio filename ve created_at'tan dosya yolunu bulur.

        Args:
            audio_filename: Dosya adı (sos_user123_20240115_143022.m4a)
            created_at: Kayıt oluşturma zamanı

        Returns:
            Path object veya None
        """
        try:
            file_path = (
                self.base_path
                / str(created_at.year)
                / f"{created_at.month:02d}"
                / f"{created_at.day:02d}"
                / audio_filename
            )

            if file_path.exists():
                return file_path
            else:
                logger.warning("Audio file bulunamadı: %s", file_path)
                return None

        except Exception as exc:
            logger.error("Audio path hatası: %s", exc)
            return None


# Singleton instance
_audio_storage: Optional[AudioStorage] = None


def get_audio_storage() -> AudioStorage:
    """Audio storage singleton döndürür."""
    global _audio_storage
    if _audio_storage is None:
        _audio_storage = AudioStorage()
    return _audio_storage
