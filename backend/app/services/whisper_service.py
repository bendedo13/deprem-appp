"""
OpenAI Whisper API servisi.
Ses dosyalarını metne çevirir (speech-to-text).
"""

import logging
from typing import Optional

import httpx

from app.config import settings

logger = logging.getLogger(__name__)


class WhisperServiceError(Exception):
    """Whisper API hatası."""
    pass


class WhisperService:
    """OpenAI Whisper API client."""

    def __init__(self):
        self.api_key = settings.OPENAI_API_KEY
        self.api_url = "https://api.openai.com/v1/audio/transcriptions"
        self.model = settings.OPENAI_WHISPER_MODEL
        self.language = settings.OPENAI_WHISPER_LANGUAGE
        self.timeout = 10  # seconds

    async def transcribe(
        self,
        audio_path: str,
        language: Optional[str] = None,
        timeout: Optional[int] = None
    ) -> str:
        """
        Ses dosyasını metne çevirir.

        Args:
            audio_path: Ses dosyası yolu
            language: Dil kodu (default: "tr" for Turkish)
            timeout: Request timeout (saniye)

        Returns:
            Transcribed text

        Raises:
            WhisperServiceError: Transcription başarısız olursa
        """
        if not self.api_key:
            raise WhisperServiceError("OpenAI API key yapılandırılmamış")

        timeout = timeout or self.timeout
        language = language or self.language

        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                with open(audio_path, "rb") as audio_file:
                    response = await client.post(
                        self.api_url,
                        headers={"Authorization": f"Bearer {self.api_key}"},
                        files={"file": audio_file},
                        data={
                            "model": self.model,
                            "language": language,
                            "response_format": "text"
                        }
                    )

                if response.status_code != 200:
                    error_detail = response.text
                    logger.error("Whisper API error: %s", error_detail)
                    raise WhisperServiceError(f"Whisper API error: {error_detail}")

                transcription = response.text.strip()
                logger.info("Whisper transcription başarılı: %d karakter", len(transcription))
                return transcription

        except httpx.TimeoutException:
            logger.error("Whisper API timeout")
            raise WhisperServiceError("Whisper API timeout")
        except WhisperServiceError:
            raise
        except Exception as exc:
            logger.error("Whisper transcription hatası: %s", exc)
            raise WhisperServiceError(f"Whisper transcription failed: {str(exc)}")


# Singleton instance
_whisper_service: Optional[WhisperService] = None


def get_whisper_service() -> WhisperService:
    """Whisper service singleton döndürür."""
    global _whisper_service
    if _whisper_service is None:
        _whisper_service = WhisperService()
    return _whisper_service
