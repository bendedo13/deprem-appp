"""Add subscription fields and notification_logs table

Revision ID: 009
Revises: 008
Create Date: 2026-03-08

Users tablosuna abonelik alanları (subscription_plan, subscription_expires_at, trial_used)
ve notification_logs tablosu eklenir.
"""

from alembic import op
import sqlalchemy as sa

revision = "009"
down_revision = "008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── Users tablosuna abonelik alanları ─────────────────────────────────
    op.execute(
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_plan VARCHAR(20) NOT NULL DEFAULT 'free'"
    )
    op.execute(
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ"
    )
    op.execute(
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_used BOOLEAN NOT NULL DEFAULT false"
    )

    # ── notification_logs tablosu ─────────────────────────────────────────
    op.execute("""
        CREATE TABLE IF NOT EXISTS notification_logs (
            id SERIAL PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            body TEXT NOT NULL,
            image_url VARCHAR(512),
            target_type VARCHAR(20) NOT NULL DEFAULT 'broadcast',
            target_user_id INTEGER,
            total_targets INTEGER DEFAULT 0,
            sent_count INTEGER DEFAULT 0,
            failed_count INTEGER DEFAULT 0,
            sent_by INTEGER,
            data JSON,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    """)


def downgrade() -> None:
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS subscription_plan")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS subscription_expires_at")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS trial_used")
    op.execute("DROP TABLE IF EXISTS notification_logs")
