"""
JWT kimlik doğrulama servisi.
Şifre hash'leme (Argon2), token üretme/doğrulama ve Firebase ID token doğrulama.
"""

import logging
import os
from datetime import datetime, timedelta, timezone
from typing import Optional

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.config import settings

logger = logging.getLogger(__name__)

_firebase_available = False
firebase_auth = None

try:
    import firebase_admin
    from firebase_admin import auth as firebase_auth_module, credentials

    if not firebase_admin._apps:
        cred_path = getattr(settings, "FIREBASE_CREDENTIALS_PATH", "firebase-service-account.json")

        if os.path.exists(cred_path):
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
            logger.info("Firebase Admin SDK başlatıldı (JSON: %s)", cred_path)

        elif all([
            getattr(settings, "FIREBASE_PROJECT_ID", ""),
            getattr(settings, "FIREBASE_PRIVATE_KEY", ""),
            getattr(settings, "FIREBASE_CLIENT_EMAIL", ""),
        ]):
            private_key = settings.FIREBASE_PRIVATE_KEY.replace("\\n", "\n")
            # FIREBASE_PRIVATE_KEY_ID opsiyonel — Service Account JSON'dan alınır.
            # Firebase Admin SDK token doğrulama için private_key_id zorunlu değildir.
            private_key_id = getattr(settings, "FIREBASE_PRIVATE_KEY_ID", "") or ""
            client_id = getattr(settings, "FIREBASE_CLIENT_ID", "") or ""
            cred_dict = {
                "type": "service_account",
                "project_id": settings.FIREBASE_PROJECT_ID,
                "private_key_id": private_key_id,
                "private_key": private_key,
                "client_email": settings.FIREBASE_CLIENT_EMAIL,
                "client_id": client_id,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
                "client_x509_cert_url": (
                    f"https://www.googleapis.com/robot/v1/metadata/x509/"
                    f"{settings.FIREBASE_CLIENT_EMAIL.replace('@', '%40')}"
                    if settings.FIREBASE_CLIENT_EMAIL else ""
                ),
            }
            cred = credentials.Certificate(cred_dict)
            firebase_admin.initialize_app(cred)
            logger.info("Firebase Admin SDK başlatıldı (env variables)")

        else:
            raise ValueError(
                "Firebase credentials bulunamadı! "
                "FIREBASE_CREDENTIALS_PATH veya FIREBASE_PROJECT_ID+FIREBASE_PRIVATE_KEY+"
                "FIREBASE_CLIENT_EMAIL ayarlayın."
            )

    firebase_auth = firebase_auth_module
    _firebase_available = True
    logger.info("Firebase Admin SDK hazır ✓")

except Exception as e:
    logger.error("Firebase Admin SDK başlatılamadı: %s", e)
    _firebase_available = False


# Argon2 ile şifre hash'leme
_pwd_context = CryptContext(
    schemes=["argon2", "bcrypt"],
    deprecated="auto",
    argon2__rounds=2,
)

_ALGORITHM = "HS256"


def hash_password(plain: str) -> str:
    return _pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return _pwd_context.verify(plain, hashed)
    except Exception as exc:
        logger.error("Password verification hatası: %s", exc)
        return False


def create_access_token(user_id: int, email: str) -> str:
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
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[_ALGORITHM])
    except JWTError as exc:
        logger.warning("Token doğrulama başarısız: %s", exc)
        return None


def verify_firebase_token(id_token: str) -> Optional[dict]:
    """Firebase ID token doğrular."""
    if not _firebase_available or firebase_auth is None:
        logger.error("Firebase Admin SDK kullanılamıyor — credentials eksik.")
        return None
    try:
        decoded = firebase_auth.verify_id_token(id_token, check_revoked=False)
        logger.debug("Firebase token doğrulandı: uid=%s", decoded.get("uid"))
        return decoded
    except Exception as exc:
        logger.warning("Firebase token doğrulama hatası: %s", exc)
        return None
