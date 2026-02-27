"""add emergency contact fields

Revision ID: 006
Revises: 005
Create Date: 2026-02-26 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '006'
down_revision = '005'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # All columns already handled in migration 005 with IF NOT EXISTS
    # This migration is a no-op placeholder to fix the VPS migration history
    pass


def downgrade() -> None:
    pass
