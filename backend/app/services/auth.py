"""
JWT kimlik doğrulama servisi.
Şifre hash'leme (bcrypt), token üretme ve doğrulama işlemleri.
rules.md: API key/secret asla kodda olmaz — SECRET_KEY .env'den gelir.
"""

import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.config import settings

logger = logging.getLogger(__name__)

# bcrypt ile şifre hash'leme (endüstri standardı)
_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT algoritması
_ALGORITHM = "HS256"


def hash_password(plain: str) -> str:
    """Düz metin şifreyi bcrypt ile hash'ler."""
    return _pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    """Düz metin şifreyi hash ile karşılaştırır."""
    return _pwd_context.verify(plain, hashed)


def create_access_token(user_id: int, email: str) -> str:
    """
    JWT access token oluşturur.

    Args:
        user_id: Kullanıcı ID'si (sub claim).
        email: Kullanıcı e-postası (payload'a eklenir).

    Returns:
        İmzalı JWT string.
    """
    expire = datetime.now(tz=timezone.utc) + timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    payload = {
        "sub": str(user_id),
        "email": email,
        "exp": expire,
        "iat": datetime.now(tz=timezone.utc),
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=_ALGORITHM)


def decode_token(token: str) -> Optional[dict]:
    """
    JWT token'ı doğrular ve payload'ı döndürür.

    Returns:
        Payload dict veya geçersizse None.
    """
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[_ALGORITHM])
    except JWTError as exc:
        logger.warning("Token doğrulama başarısız: %s", exc)
        return None
