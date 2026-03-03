"""
Google OAuth token doğrulama servisi.
rules.md: Type hints, max 50 satır/fonksiyon, async operations.
"""

import logging
from typing import Dict, Any, Optional

from google.auth.transport import requests
from google.oauth2 import id_token
from pydantic import EmailStr

from app.config import get_settings

logger = logging.getLogger(__name__)


async def verify_google_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Google ID token'ı doğrular ve kullanıcı bilgisini döner.
    
    Args:
        token: Google ID token
        
    Returns:
        Token payload (sub, email, name, picture) veya None
        
    Raises:
        ValueError: Token invalid veya expired
    """
    try:
        settings = get_settings()
        
        # Google public keys ile token doğrula
        idinfo = id_token.verify_oauth2_token(
            token,
            requests.Request(),
            settings.GOOGLE_CLIENT_ID,
            clock_skew_in_seconds=10
        )
        
        # Token valid, kullanıcı bilgisini çıkar
        if "email" not in idinfo:
            logger.warning("Google token'da email yok: %s", token[:20])
            return None
            
        logger.info("Google token doğrulandı: email=%s", idinfo.get("email"))
        return {
            "sub": idinfo.get("sub"),  # Google user ID
            "email": idinfo.get("email"),
            "name": idinfo.get("name"),
            "picture": idinfo.get("picture"),
            "email_verified": idinfo.get("email_verified", False),
        }
        
    except ValueError as e:
        logger.warning("Google token doğrulama başarısız: %s", str(e))
        return None
    except Exception as e:
        logger.error("Google OAuth hatası: %s", str(e))
        return None


async def get_or_create_user_from_google(
    email: EmailStr,
    name: Optional[str] = None,
    picture_url: Optional[str] = None,
    db_session=None
) -> tuple[Any, bool]:
    """
    Google verilerine göre kullanıcı oluştur veya getir.
    
    Args:
        email: Google email
        name: Kullanıcı adı
        picture_url: Profil resmi URL'si
        db_session: SQLAlchemy session
        
    Returns:
        (User model, is_new_user)
    """
    from sqlalchemy import select
    from app.models.user import User
    
    if not db_session:
        return None, False
    
    # Mevcut kullanıcı ara
    result = await db_session.execute(
        select(User).where(User.email == email)
    )
    user = result.scalar_one_or_none()
    
    if user:
        logger.info("Google kullanıcısı bulundu: email=%s", email)
        return user, False
    
    # Yeni kullanıcı oluştur (şifre için random string)
    import secrets
    random_password = secrets.token_urlsafe(32)
    
    from app.services.auth import hash_password
    user = User(
        email=email,
        password_hash=hash_password(random_password),
        name=name or email.split("@")[0],  # Email'in @ öncesi kısmı
        is_active=True,
        avatar=picture_url
    )
    
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    
    logger.info("Yeni Google kullanıcısı oluşturuldu: id=%d email=%s", user.id, email)
    return user, True
