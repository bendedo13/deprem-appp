"""
Alembic migration — users tablosuna is_admin kolonu ekle.
"""

from alembic import op
import sqlalchemy as sa

revision = "003"
down_revision = "002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """users tablosuna is_admin kolonu ekle."""
    op.add_column(
        "users",
        sa.Column("is_admin", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )


def downgrade() -> None:
    """is_admin kolonunu kaldır."""
    op.drop_column("users", "is_admin")
