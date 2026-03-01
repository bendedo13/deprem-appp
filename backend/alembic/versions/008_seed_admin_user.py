"""
Alembic migration — Kalıcı admin kullanıcısı seed et.
Admin: bendedo13@gmail.com / Benalan.1

Revision ID: 008
Revises: 007
Create Date: 2026-01-01
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import table, column
from passlib.context import CryptContext

revision = "008"
down_revision = "007"
branch_labels = None
depends_on = None

# Şifre hash'leme için bcrypt context
_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Admin bilgileri
ADMIN_EMAIL = "bendedo13@gmail.com"
ADMIN_PASSWORD = "Benalan.1"


def upgrade() -> None:
    """Admin kullanıcısını oluştur veya güncelle."""
    # Tablo referansı (ORM olmadan direkt SQL)
    users_table = table(
        "users",
        column("email", sa.String),
        column("password_hash", sa.String),
        column("is_active", sa.Boolean),
        column("is_admin", sa.Boolean),
    )

    # Şifreyi hash'le
    password_hash = _pwd_context.hash(ADMIN_PASSWORD)

    # Bağlantıyı al
    conn = op.get_bind()

    # Admin kullanıcısı var mı kontrol et
    result = conn.execute(
        sa.text("SELECT id FROM users WHERE email = :email"),
        {"email": ADMIN_EMAIL}
    )
    existing = result.fetchone()

    if existing:
        # Varsa şifreyi ve admin yetkisini güncelle
        conn.execute(
            sa.text(
                "UPDATE users SET password_hash = :ph, is_admin = true, is_active = true "
                "WHERE email = :email"
            ),
            {"ph": password_hash, "email": ADMIN_EMAIL}
        )
        print(f"[008] Admin kullanıcısı güncellendi: {ADMIN_EMAIL}")
    else:
        # Yoksa oluştur
        conn.execute(
            sa.text(
                "INSERT INTO users (email, password_hash, is_active, is_admin) "
                "VALUES (:email, :ph, true, true)"
            ),
            {"email": ADMIN_EMAIL, "ph": password_hash}
        )
        print(f"[008] Admin kullanıcısı oluşturuldu: {ADMIN_EMAIL}")


def downgrade() -> None:
    """Admin kullanıcısını sil (dikkatli kullan!)."""
    conn = op.get_bind()
    conn.execute(
        sa.text("DELETE FROM users WHERE email = :email AND is_admin = true"),
        {"email": ADMIN_EMAIL}
    )
    print(f"[008] Admin kullanıcısı silindi: {ADMIN_EMAIL}")