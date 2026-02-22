"""
Anthropic Claude LLM servisi.
Transcribed text'ten yapılandırılmış S.O.S verisi çıkarır.
"""

import json
import logging
from typing import Dict, Optional, Any

from app.config import settings

logger = logging.getLogger(__name__)


class LLMExtractorError(Exception):
    """LLM extraction hatası."""
    pass


class LLMExtractor:
    """Anthropic Claude API client for S.O.S data extraction."""

    def __init__(self):
        self.api_key = settings.ANTHROPIC_API_KEY
        self.model = settings.ANTHROPIC_MODEL
        self.timeout = 15  # seconds

        # Anthropic client'ı lazy load
        self.client: Optional[Any] = None

    def _init_client(self):
        """Anthropic client'ı başlatır."""
        if self.client is not None:
            return

        if not self.api_key:
            raise LLMExtractorError("Anthropic API key yapılandırılmamış")

        try:
            import anthropic
            self.client = anthropic.Anthropic(api_key=self.api_key)
            logger.info("Anthropic client başlatıldı")
        except ImportError:
            raise LLMExtractorError("anthropic paketi yüklü değil")
        except Exception as exc:
            raise LLMExtractorError(f"Anthropic client başlatma hatası: {exc}")

    async def extract_sos_data(
        self,
        transcription: str,
        timeout: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Transcribed text'ten yapılandırılmış S.O.S verisi çıkarır.

        Args:
            transcription: Whisper'dan gelen metin
            timeout: Request timeout (saniye)

        Returns:
            Dictionary: {durum, kisi_sayisi, aciliyet, lokasyon}

        Raises:
            LLMExtractorError: Extraction başarısız olursa
        """
        self._init_client()
        timeout = timeout or self.timeout

        prompt = f"""Sen bir acil durum analiz asistanısın. Aşağıdaki deprem sırasında kaydedilmiş ses metninden yapılandırılmış veri çıkar.

Metin: "{transcription}"

Lütfen şu bilgileri çıkar ve JSON formatında döndür:
- durum: "Enkaz Altında" veya "Güvende" (kişi enkaz altında mı yoksa güvende mi?)
- kisi_sayisi: Kaç kişi olduğu (sayı olarak, belirtilmemişse 1)
- aciliyet: "Kırmızı" (acil yardım gerekli), "Sarı" (yardım gerekebilir), veya "Yeşil" (güvende)
- lokasyon: Söylenen adres veya yer bilgisi (belirtilmemişse boş string)

Sadece JSON döndür, başka açıklama ekleme.

Örnek:
{{
  "durum": "Enkaz Altında",
  "kisi_sayisi": 2,
  "aciliyet": "Kırmızı",
  "lokasyon": "Atatürk Mahallesi, Bina 15, Daire 3"
}}"""

        try:
            import anthropic

            message = self.client.messages.create(
                model=self.model,
                max_tokens=500,
                temperature=0,
                timeout=timeout,
                messages=[{"role": "user", "content": prompt}]
            )

            response_text = message.content[0].text.strip()
            logger.info("Claude response: %s", response_text)

            # Parse JSON response
            extracted = json.loads(response_text)

            # Validate and set defaults
            result = {
                "durum": extracted.get("durum", "Bilinmiyor"),
                "kisi_sayisi": int(extracted.get("kisi_sayisi", 1)),
                "aciliyet": extracted.get("aciliyet", "Sarı"),
                "lokasyon": extracted.get("lokasyon", "")
            }

            # Validate values
            if result["durum"] not in ["Enkaz Altında", "Güvende", "Bilinmiyor"]:
                result["durum"] = "Bilinmiyor"
            if result["aciliyet"] not in ["Kırmızı", "Sarı", "Yeşil"]:
                result["aciliyet"] = "Sarı"
            if result["kisi_sayisi"] < 1:
                result["kisi_sayisi"] = 1

            logger.info("LLM extraction başarılı: %s", result)
            return result

        except anthropic.APITimeoutError:
            logger.error("Claude API timeout")
            raise LLMExtractorError("Claude API timeout")
        except json.JSONDecodeError as exc:
            logger.error("Claude response JSON parse hatası: %s", exc)
            raise LLMExtractorError("Failed to parse Claude response as JSON")
        except Exception as exc:
            logger.error("LLM extraction hatası: %s", exc)
            raise LLMExtractorError(f"LLM extraction failed: {str(exc)}")


# Singleton instance
_llm_extractor: Optional[LLMExtractor] = None


def get_llm_extractor() -> LLMExtractor:
    """LLM extractor singleton döndürür."""
    global _llm_extractor
    if _llm_extractor is None:
        _llm_extractor = LLMExtractor()
    return _llm_extractor
