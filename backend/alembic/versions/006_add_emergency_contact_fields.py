"""add emergency contact fields

Revision ID: 006
Revises: 005
Create Date: 2026-02-27 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSON


# revision identifiers, used by Alembic.
revision = '006'
down_revision = '005'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add missing fields to emergency_contacts table
    op.add_column('emergency_contacts', sa.Column('relation', sa.String(length=50), nullable=False, server_default='Diğer'))
    op.add_column('emergency_contacts', sa.Column('methods', JSON, nullable=False, server_default='["push"]'))
    op.add_column('emergency_contacts', sa.Column('priority', sa.Integer(), nullable=False, server_default='1'))


def downgrade() -> None:
    # Remove fields from emergency_contacts table
    op.drop_column('emergency_contacts', 'priority')
    op.drop_column('emergency_contacts', 'methods')
    op.drop_column('emergency_contacts', 'relation')
