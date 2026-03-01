"""
Alembic migration — notification_prefs tablosuna yeni alanlar ekle.
Bildirim kanalları, sessiz saatler ve ek özellikler için.

Revision ID: 007
Revises: 006
Create Date: 2026-02-27
"""

from alembic import op
import sqlalchemy as sa

revision = "007"
down_revision = "006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """notification_prefs tablosuna eksik kolonları ekle."""
    # Konum listesi
    op.execute(
        "ALTER TABLE notification_prefs ADD COLUMN IF NOT EXISTS locations JSON NOT NULL DEFAULT '[]'"
    )
    # Bildirim kanalları
    op.execute(
        "ALTER TABLE notification_prefs ADD COLUMN IF NOT EXISTS push_enabled BOOLEAN NOT NULL DEFAULT true"
    )
    op.execute(
        "ALTER TABLE notification_prefs ADD COLUMN IF NOT EXISTS sms_enabled BOOLEAN NOT NULL DEFAULT false"
    )
    op.execute(
        "ALTER TABLE notification_prefs ADD COLUMN IF NOT EXISTS email_enabled BOOLEAN NOT NULL DEFAULT false"
    )
    # Sessiz saatler
    op.execute(
        "ALTER TABLE notification_prefs ADD COLUMN IF NOT EXISTS quiet_hours_enabled BOOLEAN NOT NULL DEFAULT false"
    )
    op.execute(
        "ALTER TABLE notification_prefs ADD COLUMN IF NOT EXISTS quiet_start TIME"
    )
    op.execute(
        "ALTER TABLE notification_prefs ADD COLUMN IF NOT EXISTS quiet_end TIME"
    )
    # Ek özellikler
    op.execute(
        "ALTER TABLE notification_prefs ADD COLUMN IF NOT EXISTS weekly_summary BOOLEAN NOT NULL DEFAULT false"
    )
    op.execute(
        "ALTER TABLE notification_prefs ADD COLUMN IF NOT EXISTS aftershock_alerts BOOLEAN NOT NULL DEFAULT false"
    )


def downgrade() -> None:
    """Eklenen kolonları kaldır."""
    op.execute("ALTER TABLE notification_prefs DROP COLUMN IF EXISTS aftershock_alerts")
    op.execute("ALTER TABLE notification_prefs DROP COLUMN IF EXISTS weekly_summary")
    op.execute("ALTER TABLE notification_prefs DROP COLUMN IF EXISTS quiet_end")
    op.execute("ALTER TABLE notification_prefs DROP COLUMN IF EXISTS quiet_start")
    op.execute("ALTER TABLE notification_prefs DROP COLUMN IF EXISTS quiet_hours_enabled")
    op.execute("ALTER TABLE notification_prefs DROP COLUMN IF EXISTS email_enabled")
    op.execute("ALTER TABLE notification_prefs DROP COLUMN IF EXISTS sms_enabled")
    op.execute("ALTER TABLE notification_prefs DROP COLUMN IF EXISTS push_enabled")
    op.execute("ALTER TABLE notification_prefs DROP COLUMN IF EXISTS locations")