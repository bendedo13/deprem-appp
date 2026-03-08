"""
Tek seferlik SUPER-ADMIN oluşturma script'i.

Kullanıcı:
  email: bendedo13@gmail.com
  password: Benalan.1   (veritabanına HASH'LENMİŞ olarak kaydedilir)
  is_admin: True

Çalıştırma (proje kökünden):
  cd backend && python -m app.db.init_admin

VPS Docker ile (deploy sonrası şifre/is_admin güncellemek için):
  docker exec deprem_backend python -m app.db.init_admin
"""

from __future__ import annotations

import logging

from sqlalchemy import select, func

from app.database import SyncSessionLocal
from app.models.user import User
from app.services.auth import hash_password

logger = logging.getLogger(__name__)

ADMIN_EMAIL = "bendedo13@gmail.com"
ADMIN_PASSWORD = "Benalan.1"


def create_or_update_admin() -> None:
    db = SyncSessionLocal()
    try:
        email_lower = ADMIN_EMAIL.strip().lower()
        result = db.execute(select(User).where(func.lower(User.email) == email_lower))
        user: User | None = result.scalar_one_or_none()
        if not user:
            result = db.execute(select(User).where(User.email == ADMIN_EMAIL))
            user = result.scalar_one_or_none()

        if user:
            changed = False
            if not user.is_admin:
                user.is_admin = True
                changed = True
            user.password_hash = hash_password(ADMIN_PASSWORD)
            changed = True
            if user.email != email_lower:
                user.email = email_lower
                changed = True

            if changed:
                db.commit()
                logger.info("Mevcut admin güncellendi: id=%s email=%s", user.id, user.email)
            else:
                logger.info("Admin kullanıcı zaten güncel: id=%s email=%s", user.id, user.email)
            return

        # Yeni kullanıcı oluştur
        password_hash = hash_password(ADMIN_PASSWORD)
        user = User(
            email=email_lower,
            password_hash=password_hash,
            name="Super Admin",
            is_admin=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        logger.info("Yeni SUPER-ADMIN oluşturuldu: id=%s email=%s", user.id, user.email)

    finally:
        db.close()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    create_or_update_admin()

