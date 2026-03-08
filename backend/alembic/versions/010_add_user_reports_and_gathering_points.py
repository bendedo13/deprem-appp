"""Add user_reports and gathering_points tables

Revision ID: 010_add_user_reports_and_gathering_points
Revises: 009
Create Date: 2026-03-08

Kullanıcı hasar bildirimleri (user_reports) ve toplanma alanları (gathering_points)
tablolarını ekler.
"""

from alembic import op
import sqlalchemy as sa


revision = "010_add_user_reports_and_gathering_points"
down_revision = "009"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── gathering_points tablosu ─────────────────────────────────────────────
    op.create_table(
        "gathering_points",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("city", sa.String(length=100), nullable=False),
        sa.Column("district", sa.String(length=100), nullable=False),
        sa.Column("latitude", sa.Float(), nullable=False),
        sa.Column("longitude", sa.Float(), nullable=False),
        sa.Column("capacity", sa.Integer(), nullable=True),
        sa.Column("has_water", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("has_electricity", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("has_shelter", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=False),
            nullable=False,
            server_default=sa.text("NOW()"),
        ),
    )
    op.create_index(
        "idx_gathering_points_city",
        "gathering_points",
        ["city"],
    )
    op.create_index(
        "idx_gathering_points_district",
        "gathering_points",
        ["district"],
    )

    # ── user_reports tablosu ────────────────────────────────────────────────
    op.create_table(
        "user_reports",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("report_type", sa.String(length=30), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("latitude", sa.Float(), nullable=False),
        sa.Column("longitude", sa.Float(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=False),
            nullable=False,
            server_default=sa.text("NOW()"),
        ),
    )
    op.create_index("idx_user_reports_user", "user_reports", ["user_id"])
    op.create_index("idx_user_reports_type", "user_reports", ["report_type"])
    op.create_index("idx_user_reports_geo", "user_reports", ["latitude", "longitude"])
    op.create_index("idx_user_reports_created_at", "user_reports", ["created_at"])


def downgrade() -> None:
    op.drop_index("idx_user_reports_created_at", table_name="user_reports")
    op.drop_index("idx_user_reports_geo", table_name="user_reports")
    op.drop_index("idx_user_reports_type", table_name="user_reports")
    op.drop_index("idx_user_reports_user", table_name="user_reports")
    op.drop_table("user_reports")

    op.drop_index("idx_gathering_points_district", table_name="gathering_points")
    op.drop_index("idx_gathering_points_city", table_name="gathering_points")
    op.drop_table("gathering_points")

