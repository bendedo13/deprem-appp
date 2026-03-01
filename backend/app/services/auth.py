"""
JWT kimlik doğrulama servisi.
Şifre hash'leme, token oluşturma ve doğrulama.
rules.md: type hints, logging, güvenlik best practice.
"""

import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.config import settings

logger = logging.getLogger(__name__)

# Bcrypt şifre hash context
_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT algoritması
_ALGORITHM = "HS256"


def hash_password(password: str) -> str:
    """Şifreyi bcrypt ile hash'ler."""
    return _pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Düz şifreyi hash ile karşılaştırır.
    Hata durumunda False döner (exception fırlatmaz).
    """
    try:
        return _pwd_context.verify(plain_password, hashed_password)
    except Exception as e:
        logger.warning("Şifre doğrulama hatası: %s", e)
        return False


def create_access_token(user_id: int, email: str) -> str:
    """
    JWT access token oluşturur.
    Payload: sub (user_id), email, exp (son kullanma tarihi).
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
    token = jwt.encode(payload, settings.SECRET_KEY, algorithm=_ALGORITHM)
    logger.debug("JWT token oluşturuldu: user_id=%d", user_id)
    return token


def decode_token(token: str) -> Optional[dict]:
    """
    JWT token'ı çözer ve payload'ı döner.
    Geçersiz veya süresi dolmuş token için None döner.
    """
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[_ALGORITHM])
        # sub alanı zorunlu
        if "sub" not in payload:
            logger.warning("JWT payload'da 'sub' alanı eksik.")
            return None
        return payload
    except JWTError as e:
        logger.warning("JWT decode hatası: %s", e)
        return None
    except Exception as e:
        logger.error("Beklenmeyen JWT hatası: %s", e)
        return None