"""
Alembic migration — seismic_reports tablosu.
rules.md: her yeni model için migration yaz.
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "002"
down_revision = "001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """seismic_reports tablosunu oluştur."""
    op.create_table(
        "seismic_reports",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("device_id", sa.String(128), nullable=False),
        sa.Column("peak_acceleration", sa.Float(), nullable=False),
        sa.Column("sta_lta_ratio", sa.Float(), nullable=False),
        sa.Column("latitude", sa.Float(), nullable=False),
        sa.Column("longitude", sa.Float(), nullable=False),
        sa.Column("cluster_id", sa.Integer(), nullable=True),
        sa.Column(
            "reported_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_seismic_reports_device_id", "seismic_reports", ["device_id"])
    op.create_index("ix_seismic_reports_reported_at", "seismic_reports", ["reported_at"])
    op.create_index("ix_seismic_reports_cluster_id", "seismic_reports", ["cluster_id"])


def downgrade() -> None:
    """seismic_reports tablosunu sil."""
    op.drop_index("ix_seismic_reports_cluster_id", table_name="seismic_reports")
    op.drop_index("ix_seismic_reports_reported_at", table_name="seismic_reports")
    op.drop_index("ix_seismic_reports_device_id", table_name="seismic_reports")
    op.drop_table("seismic_reports")
