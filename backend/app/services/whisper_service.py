"""
Groq Whisper transkripsiyon servisi (S.O.S ses → metin).
OpenAI Whisper yerine Groq whisper-large-v3 kullanır.
API anahtarı .env içinde GROQ_API_KEY olarak tanımlanır.
"""

import logging
from typing import Optional

from groq import Groq

from app.config import settings

logger = logging.getLogger(__name__)


class WhisperServiceError(Exception):
    """Transkripsiyon API hatası."""
    pass


class WhisperService:
    """Groq Whisper API client (whisper-large-v3)."""

    def __init__(self) -> None:
        self.api_key = settings.GROQ_API_KEY
        self.model = settings.GROQ_WHISPER_MODEL
        self.language = settings.GROQ_WHISPER_LANGUAGE
        self.timeout = 10  # saniye

    async def transcribe(
        self,
        audio_path: str,
        language: Optional[str] = None,
        timeout: Optional[int] = None
    ) -> str:
        """
        Ses dosyasını metne çevirir (Groq whisper-large-v3).

        Args:
            audio_path: Ses dosyası yolu (M4A, WAV, MP3 vb.)
            language: Dil kodu (varsayılan: "tr")
            timeout: İstek zaman aşımı (saniye)

        Returns:
            Transkribe edilmiş metin

        Raises:
            WhisperServiceError: Transkripsiyon başarısız olursa
        """
        if not self.api_key:
            raise WhisperServiceError("GROQ_API_KEY yapılandırılmamış")

        lang = language or self.language

        try:
            client = Groq(api_key=self.api_key, timeout=timeout or self.timeout)
            with open(audio_path, "rb") as audio_file:
                response = client.audio.transcriptions.create(
                    file=audio_file,
                    model=self.model,
                    language=lang,
                    response_format="text",
                )

            if hasattr(response, "text"):
                text = response.text.strip()
            else:
                text = str(response).strip()

            logger.info("Groq Whisper transkripsiyon başarılı: %d karakter", len(text))
            return text

        except Exception as exc:
            logger.error("Groq transkripsiyon hatası: %s", exc)
            raise WhisperServiceError(f"Groq transcription failed: {str(exc)}")


_whisper_service: Optional[WhisperService] = None


def get_whisper_service() -> WhisperService:
    """Transkripsiyon servisi singleton döndürür (Groq)."""
    global _whisper_service
    if _whisper_service is None:
        _whisper_service = WhisperService()
    return _whisper_service
