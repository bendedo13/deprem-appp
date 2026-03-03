"""add_sos_records_table

Revision ID: 004
Revises: 003
Create Date: 2024-02-23

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '004'
down_revision = '003'
branch_labels = None
depends_on = None


def _table_exists(name: str) -> bool:
    conn = op.get_bind()
    insp = inspect(conn)
    return name in insp.get_table_names()


def upgrade() -> None:
    if _table_exists('sos_records'):
        return
    # Create sos_records table
    op.create_table(
        'sos_records',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('durum', sa.String(length=50), nullable=False),
        sa.Column('kisi_sayisi', sa.Integer(), nullable=False),
        sa.Column('aciliyet', sa.String(length=20), nullable=False),
        sa.Column('lokasyon', sa.Text(), nullable=False),
        sa.Column('orijinal_metin', sa.Text(), nullable=True),
        sa.Column('audio_url', sa.String(length=500), nullable=False),
        sa.Column('audio_filename', sa.String(length=255), nullable=False),
        sa.Column('latitude', sa.Float(), nullable=True),
        sa.Column('longitude', sa.Float(), nullable=True),
        sa.Column('processing_status', sa.String(length=20), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # Create indexes
    op.create_index('idx_sos_user_created', 'sos_records', ['user_id', 'created_at'], unique=False)
    op.create_index('idx_sos_aciliyet', 'sos_records', ['aciliyet'], unique=False)
    op.create_index('idx_sos_status', 'sos_records', ['processing_status'], unique=False)
    op.create_index(op.f('ix_sos_records_created_at'), 'sos_records', ['created_at'], unique=False)
    op.create_index(op.f('ix_sos_records_user_id'), 'sos_records', ['user_id'], unique=False)


def downgrade() -> None:
    # Drop indexes
    op.drop_index(op.f('ix_sos_records_user_id'), table_name='sos_records')
    op.drop_index(op.f('ix_sos_records_created_at'), table_name='sos_records')
    op.drop_index('idx_sos_status', table_name='sos_records')
    op.drop_index('idx_sos_aciliyet', table_name='sos_records')
    op.drop_index('idx_sos_user_created', table_name='sos_records')
    
    # Drop table
    op.drop_table('sos_records')
