"""
Groq Whisper transkripsiyon servisi testi.
Küçük bir ses dosyasıyla transkripsiyonun başarılı döndüğünü doğrular.
Çalıştırma: backend dizininde iken
  python -m pytest app/tests/test_groq.py -v -s
veya
  python app/tests/test_groq.py
"""

import asyncio
import tempfile
import wave
import os
import sys

# Backend root'u path'e ekle
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))


def _make_minimal_wav(path: str, duration_sec: float = 0.3, sample_rate: int = 16000) -> None:
    """Minimal geçerli WAV dosyası oluşturur (sessiz)."""
    with wave.open(path, "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)  # 16-bit
        wav.setframerate(sample_rate)
        n_frames = int(sample_rate * duration_sec)
        wav.writeframes(b"\x00\x00" * n_frames)


def test_groq_transcription_success() -> None:
    """Groq ile küçük ses dosyası transkripsiyonu başarılı olmalı."""
    from app.config import settings
    if not settings.GROQ_API_KEY:
        print("SKIP: GROQ_API_KEY tanımlı değil (.env)")
        return

    from app.services.whisper_service import get_whisper_service, WhisperServiceError

    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
        temp_path = f.name
    try:
        _make_minimal_wav(temp_path)
        service = get_whisper_service()
        result = asyncio.run(service.transcribe(temp_path, timeout=15))
        assert isinstance(result, str), "Transkripsiyon string dönmeli"
        print("Success")
    except WhisperServiceError as e:
        print(f"FAIL: {e}")
        raise
    finally:
        if os.path.exists(temp_path):
            os.unlink(temp_path)


if __name__ == "__main__":
    test_groq_transcription_success()
