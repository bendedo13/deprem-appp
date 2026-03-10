"""
Acil iletişim kişisi şemaları.
Pydantic v2 — phonenumbers ile TR formatı (+90) doğrulama.
Twilio E.164 formatı zorunludur.
"""

from pydantic import BaseModel, Field, field_validator

try:
    import phonenumbers
    from phonenumbers import NumberParseException
    _PHONENUMBERS_AVAILABLE = True
except ImportError:
    _PHONENUMBERS_AVAILABLE = False


def _normalize_phone_to_e164(phone: str) -> str:
    """Türkiye telefon numarasını Twilio uyumlu E.164 (+905551234567) formatına çevirir."""
    if not _PHONENUMBERS_AVAILABLE:
        cleaned = phone.strip().replace(" ", "").replace("-", "").replace("(", "").replace(")", "")
        if not cleaned:
            raise ValueError("Telefon numarası boş olamaz.")
        if cleaned.startswith("0"):
            cleaned = "+90" + cleaned[1:]
        elif not cleaned.startswith("+"):
            cleaned = "+90" + cleaned
        if len(cleaned) < 12:
            raise ValueError("Geçersiz telefon numarası.")
        return cleaned

    cleaned = phone.strip().replace(" ", "").replace("-", "").replace("(", "").replace(")", "")
    if not cleaned:
        raise ValueError("Telefon numarası boş olamaz.")

    if cleaned.startswith("0"):
        cleaned = "+90" + cleaned[1:]
    elif not cleaned.startswith("+"):
        cleaned = "+90" + cleaned

    try:
        parsed = phonenumbers.parse(cleaned, "TR")
        if not phonenumbers.is_valid_number(parsed):
            raise ValueError("Geçersiz telefon numarası.")
        e164 = phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164)
        if len(e164) > 32:
            raise ValueError("Telefon numarası çok uzun.")
        return e164
    except NumberParseException:
        raise ValueError("Geçersiz telefon numarası. Lütfen +90... veya 05xx formatında girin.")


class EmergencyContactIn(BaseModel):
    """Yeni acil kişi oluşturma girdisi. API: name, phone_number, relation_type."""

    name: str = Field(..., min_length=1, max_length=255)
    phone_number: str = Field(..., min_length=10)
    relation_type: str = Field(default="Diğer", max_length=50, alias="relationship")

    model_config = {"populate_by_name": True}

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("İsim boş olamaz.")
        return v.strip()

    @field_validator("phone_number")
    @classmethod
    def phone_to_e164(cls, v: str) -> str:
        return _normalize_phone_to_e164(v)


class EmergencyContactOut(BaseModel):
    """Acil kişi yanıt şeması."""

    id: int
    name: str
    phone_number: str
    relation_type: str = Field(serialization_alias="relationship")
    is_active: bool

    model_config = {"from_attributes": True}
