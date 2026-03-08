"""Add indexes on notification_logs for admin list/filter performance

Revision ID: 011_notification_log_indexes
Revises: 010_add_user_reports_and_gathering_points
Create Date: 2026-03-09

notification_logs: created_at, target_type indexleri (admin sayfalama/filtre).
"""

from alembic import op

revision = "011_notification_log_indexes"
down_revision = "010_add_user_reports_and_gathering_points"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_index(
        "idx_notification_logs_created_at",
        "notification_logs",
        ["created_at"],
    )
    op.create_index(
        "idx_notification_logs_target_type",
        "notification_logs",
        ["target_type"],
    )


def downgrade() -> None:
    op.drop_index("idx_notification_logs_target_type", table_name="notification_logs")
    op.drop_index("idx_notification_logs_created_at", table_name="notification_logs")
