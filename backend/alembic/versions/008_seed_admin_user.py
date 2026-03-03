"""
Alembic migration — Kalıcı admin kullanıcısı seed et.
Admin: bendedo13@gmail.com / Benalan.1

Revision ID: 008
Revises: 007
Create Date: 2026-01-01
"""

from alembic import op
import sqlalchemy as sa
import bcrypt

revision = "008"
down_revision = "007"
branch_labels = None
depends_on = None

# Admin bilgileri
ADMIN_EMAIL = "bendedo13@gmail.com"
ADMIN_PASSWORD = "Benalan.1"


def _hash_password(password: str) -> str:
    """Bcrypt ile şifre hash'le (passlib kullanmadan)."""
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def upgrade() -> None:
    """Admin kullanıcısını oluştur veya güncelle."""
    conn = op.get_bind()

    # Users tablosu var mı kontrol et
    result = conn.execute(
        sa.text(
            "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users')"
        )
    )
    table_exists = result.scalar()
    if not table_exists:
        print("[008] Users tablosu henüz yok, skip.")
        return

    # Şifreyi hash'le
    password_hash = _hash_password(ADMIN_PASSWORD)

    # Admin kullanıcısı var mı kontrol et
    result = conn.execute(
        sa.text("SELECT id FROM users WHERE email = :email"),
        {"email": ADMIN_EMAIL},
    )
    existing = result.fetchone()

    if existing:
        conn.execute(
            sa.text(
                "UPDATE users SET password_hash = :ph, is_admin = true, is_active = true "
                "WHERE email = :email"
            ),
            {"ph": password_hash, "email": ADMIN_EMAIL},
        )
        print(f"[008] Admin güncellendi: {ADMIN_EMAIL}")
    else:
        conn.execute(
            sa.text(
                "INSERT INTO users (email, password_hash, is_active, is_admin) "
                "VALUES (:email, :ph, true, true)"
            ),
            {"email": ADMIN_EMAIL, "ph": password_hash},
        )
        print(f"[008] Admin oluşturuldu: {ADMIN_EMAIL}")


def downgrade() -> None:
    """Admin kullanıcısını sil."""
    conn = op.get_bind()
    conn.execute(
        sa.text("DELETE FROM users WHERE email = :email AND is_admin = true"),
        {"email": ADMIN_EMAIL},
    )