"""
Acil iletişim kişisi şemaları.
Pydantic v2 — phonenumbers ile TR formatı (+90) doğrulama.
"""

from pydantic import BaseModel, Field, field_validator

try:
    import phonenumbers
    from phonenumbers import NumberParseException
    _PHONENUMBERS_AVAILABLE = True
except ImportError:
    _PHONENUMBERS_AVAILABLE = False


def _normalize_phone_tr(phone: str) -> str:
    """Türkiye telefon numarasını E.164 (+90...) formatına çevirir."""
    if not _PHONENUMBERS_AVAILABLE:
        cleaned = phone.strip().replace(" ", "").replace("-", "")
        if cleaned.startswith("0"):
            cleaned = "+90" + cleaned[1:]
        elif not cleaned.startswith("+"):
            cleaned = "+90" + cleaned
        return cleaned

    cleaned = phone.strip().replace(" ", "").replace("-", "")
    if not cleaned:
        raise ValueError("Telefon numarası boş olamaz.")

    # 0 ile başlıyorsa Türkiye için kabul et
    if cleaned.startswith("0"):
        cleaned = "+90" + cleaned[1:]
    elif not cleaned.startswith("+"):
        cleaned = "+90" + cleaned

    try:
        parsed = phonenumbers.parse(cleaned, "TR")
        if not phonenumbers.is_valid_number(parsed):
            raise ValueError("Geçersiz telefon numarası.")
        return phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164)
    except NumberParseException:
        raise ValueError("Geçersiz telefon numarası. Lütfen +90... veya 05xx formatında girin.")


class EmergencyContactIn(BaseModel):
    """Yeni acil kişi oluşturma girdisi."""

    name: str = Field(..., min_length=1, max_length=255)
    phone_number: str = Field(..., min_length=10)
    relationship: str = Field(default="Diğer", max_length=50)

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("İsim boş olamaz.")
        return v.strip()

    @field_validator("phone_number")
    @classmethod
    def phone_format(cls, v: str) -> str:
        return _normalize_phone_tr(v)


class EmergencyContactOut(BaseModel):
    """Acil kişi yanıt şeması."""

    id: int
    name: str
    phone_number: str
    relationship: str
    is_active: bool

    model_config = {"from_attributes": True}
