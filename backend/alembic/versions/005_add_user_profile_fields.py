"""add user profile fields and emergency contact fields

Revision ID: 005
Revises: 004
Create Date: 2026-02-24 02:30:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '005'
down_revision = '004'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add profile fields to users table (IF NOT EXISTS for idempotency)
    op.execute('ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(100)')
    op.execute('ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20)')
    op.execute('ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar VARCHAR(10)')
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS plan VARCHAR(20) NOT NULL DEFAULT 'free'")
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS join_date TIMESTAMPTZ NOT NULL DEFAULT now()")

    # Add missing columns to emergency_contacts table (IF NOT EXISTS for idempotency)
    op.execute("ALTER TABLE emergency_contacts ADD COLUMN IF NOT EXISTS relation VARCHAR(50) NOT NULL DEFAULT 'Diğer'")
    op.execute("ALTER TABLE emergency_contacts ADD COLUMN IF NOT EXISTS methods JSON NOT NULL DEFAULT '[\"push\"]'")
    op.execute('ALTER TABLE emergency_contacts ADD COLUMN IF NOT EXISTS priority INTEGER NOT NULL DEFAULT 1')


def downgrade() -> None:
    # Remove columns from emergency_contacts table (only if they exist)
    op.execute('ALTER TABLE emergency_contacts DROP COLUMN IF EXISTS priority')
    op.execute('ALTER TABLE emergency_contacts DROP COLUMN IF EXISTS methods')
    op.execute('ALTER TABLE emergency_contacts DROP COLUMN IF EXISTS relation')

    # Remove profile fields from users table (IF NOT EXISTS for safety)
    op.execute('ALTER TABLE users DROP COLUMN IF EXISTS join_date')
    op.execute('ALTER TABLE users DROP COLUMN IF EXISTS plan')
    op.execute('ALTER TABLE users DROP COLUMN IF EXISTS avatar')
    op.execute('ALTER TABLE users DROP COLUMN IF EXISTS phone')
    op.execute('ALTER TABLE users DROP COLUMN IF EXISTS name')
