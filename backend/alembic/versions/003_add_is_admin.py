"""
Alembic migration — users tablosuna is_admin kolonu ekle.
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

revision = "003"
down_revision = "002"
branch_labels = None
depends_on = None


def _column_exists(table: str, column: str) -> bool:
    conn = op.get_bind()
    insp = inspect(conn)
    columns = [c["name"] for c in insp.get_columns(table)]
    return column in columns


def upgrade() -> None:
    """users tablosuna is_admin kolonu ekle."""
    if _column_exists("users", "is_admin"):
        return
    op.add_column(
        "users",
        sa.Column("is_admin", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )


def downgrade() -> None:
    """is_admin kolonunu kaldır."""
    op.drop_column("users", "is_admin")
