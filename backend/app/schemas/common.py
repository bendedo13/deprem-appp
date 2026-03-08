"""
Standart API yanıt şemaları — Success/Error JSON formatı.
Tüm endpoint'ler bu yapıya uyumlu yanıt dönebilir.
"""

from typing import Any, Generic, Optional, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


class ApiSuccess(BaseModel, Generic[T]):
    """Başarılı yanıt: ok=True, isteğe bağlı data/message."""
    ok: bool = True
    message: Optional[str] = None
    data: Optional[T] = None

    @classmethod
    def with_message(cls, message: str) -> "ApiSuccess[None]":
        return cls(ok=True, message=message)

    @classmethod
    def with_data(cls, data: T, message: Optional[str] = None) -> "ApiSuccess[T]":
        return cls(ok=True, message=message, data=data)


class ApiError(BaseModel):
    """Hata yanıtı: ok=False, detail zorunlu."""
    ok: bool = False
    detail: str = Field(..., description="Hata mesajı")
    code: Optional[str] = None
