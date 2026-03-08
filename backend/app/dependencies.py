"""
Ortak FastAPI bağımlılıkları — DRY.
Auth (get_current_user, get_admin_user) tek yerde tanımlanır.
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.services.auth import decode_token

_http_bearer = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_http_bearer),
    db: AsyncSession = Depends(get_db),
) -> User:
    """JWT token'ı doğrular, User döndürür. Geçersizse 401 fırlatır."""
    payload = decode_token(credentials.credentials)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Geçersiz veya süresi dolmuş token.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user = await db.get(User, int(payload["sub"]))
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Kullanıcı bulunamadı veya devre dışı.",
        )
    return user


async def get_admin_user(current_user: User = Depends(get_current_user)) -> User:
    """JWT doğrulamasına ek olarak is_admin kontrolü yapar."""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bu endpoint yalnızca admin kullanıcılara açıktır.",
        )
    return current_user
