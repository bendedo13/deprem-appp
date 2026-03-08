"""add community reports table

Revision ID: 009_add_community_reports
Revises: 008_add_support_tickets
Create Date: 2026-03-08
"""

from alembic import op
import sqlalchemy as sa

revision = "009_add_community_reports"
down_revision = "008_add_support_tickets"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "community_reports",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("category", sa.String(50), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("district", sa.String(100), nullable=True),
        sa.Column("latitude", sa.Float(), nullable=True),
        sa.Column("longitude", sa.Float(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_community_reports_category", "community_reports", ["category"])
    op.create_index("ix_community_reports_created_at", "community_reports", ["created_at"])


def downgrade() -> None:
    op.drop_index("ix_community_reports_created_at", table_name="community_reports")
    op.drop_index("ix_community_reports_category", table_name="community_reports")
    op.drop_table("community_reports")
