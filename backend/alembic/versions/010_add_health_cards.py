"""Add health cards table

Revision ID: 010_add_health_cards
Revises: 009_add_community_reports
Create Date: 2026-03-08
"""

from alembic import op
import sqlalchemy as sa

revision = "010_add_health_cards"
down_revision = "009_add_community_reports"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "health_cards",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True),
        sa.Column("blood_type", sa.String(20), server_default="Bilinmiyor"),
        sa.Column("allergies", sa.Text(), server_default=""),
        sa.Column("medications", sa.Text(), server_default=""),
        sa.Column("conditions", sa.Text(), server_default=""),
        sa.Column("emergency_note", sa.Text(), server_default=""),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("health_cards")
