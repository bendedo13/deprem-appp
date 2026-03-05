"""
JWT kimlik doğrulama servisi.
Şifre hash'leme (Argon2), token üretme/doğrulama ve Firebase ID token doğrulama.
rules.md: API key/secret asla kodda olmaz — SECRET_KEY .env'den gelir.
"""

import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.config import settings

try:
    import firebase_admin
    from firebase_admin import auth as firebase_auth

    if not firebase_admin._apps:
        firebase_admin.initialize_app()
    _firebase_available = True
except Exception:
    _firebase_available = False

logger = logging.getLogger(__name__)

# Argon2 ile şifre hash'leme (modern, güvenli, 72 byte limiti yok)
# Fallback olarak bcrypt (eski hash'ler için)
_pwd_context = CryptContext(
    schemes=["argon2", "bcrypt"],
    deprecated="auto",
    argon2__rounds=2,  # Performans için optimize edilmiş
)

# JWT algoritması
_ALGORITHM = "HS256"


def hash_password(plain: str) -> str:
    """Düz metin şifreyi Argon2 ile hash'ler."""
    return _pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    """
    Düz metin şifreyi hash ile karşılaştırır.
    Argon2 ve bcrypt hash'lerini destekler (backward compatibility).
    """
    try:
        return _pwd_context.verify(plain, hashed)
    except Exception as exc:
        logger.error("Password verification hatası: %s", exc)
        return False


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


def verify_firebase_token(id_token: str) -> Optional[dict]:
    """
    Firebase ID token'ı doğrular.

    Returns:
        Firebase decoded token dict (uid, email, name vb.) veya geçersizse None.
    """
    if not _firebase_available:
        logger.warning("Firebase Admin SDK yüklü değil, token doğrulanamadı.")
        return None
    try:
        decoded = firebase_auth.verify_id_token(id_token)
        return decoded
    except Exception as exc:
        logger.warning("Firebase token doğrulama başarısız: %s", exc)
        return None
