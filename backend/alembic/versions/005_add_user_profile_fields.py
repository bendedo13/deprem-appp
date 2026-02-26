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
    # Add profile fields to users table
    op.add_column('users', sa.Column('name', sa.String(length=100), nullable=True))
    op.add_column('users', sa.Column('phone', sa.String(length=20), nullable=True))
    op.add_column('users', sa.Column('avatar', sa.String(length=10), nullable=True))
    op.add_column('users', sa.Column('plan', sa.String(length=20), nullable=False, server_default='free'))
    op.add_column('users', sa.Column('join_date', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()))

    # Add missing columns to emergency_contacts table
    op.add_column('emergency_contacts', sa.Column('relation', sa.String(length=50), nullable=False, server_default='Diğer'))
    op.add_column('emergency_contacts', sa.Column('methods', sa.JSON(), nullable=False, server_default='["push"]'))
    op.add_column('emergency_contacts', sa.Column('priority', sa.Integer(), nullable=False, server_default='1'))


def downgrade() -> None:
    # Remove columns from emergency_contacts table (only if they exist)
    op.execute('ALTER TABLE emergency_contacts DROP COLUMN IF EXISTS priority')
    op.execute('ALTER TABLE emergency_contacts DROP COLUMN IF EXISTS methods')
    op.execute('ALTER TABLE emergency_contacts DROP COLUMN IF EXISTS relation')

    # Remove profile fields from users table
    op.drop_column('users', 'join_date')
    op.drop_column('users', 'plan')
    op.drop_column('users', 'avatar')
    op.drop_column('users', 'phone')
    op.drop_column('users', 'name')
