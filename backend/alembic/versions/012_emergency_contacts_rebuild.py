"""Rebuild emergency_contacts: name, phone_number, relationship, is_active

Revision ID: 012_emergency_contacts_rebuild
Revises: 011_notification_log_indexes
Create Date: 2026-03-09

Yeni şema: name, phone_number, relationship, is_active, user_id
Eski alanlar (email, channel, methods, priority, relation) kaldırıldı.
"""

from alembic import op
import sqlalchemy as sa


revision = "012_emergency_contacts_rebuild"
down_revision = "011_notification_log_indexes"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Yeni tablo oluştur
    op.create_table(
        "emergency_contacts_new",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("phone_number", sa.String(length=32), nullable=False),
        sa.Column("relationship", sa.String(length=50), nullable=False, server_default="Diğer"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_emergency_contacts_user_id", "emergency_contacts_new", ["user_id"], unique=False)

    # Veri taşı (phone -> phone_number, relation -> relationship)
    conn = op.get_bind()
    # relation sütunu 005 migration ile eklenmiş olabilir
    try:
        conn.execute(sa.text("""
            INSERT INTO emergency_contacts_new (user_id, name, phone_number, relationship, is_active)
            SELECT user_id, name, COALESCE(phone, ''), COALESCE(relation, 'Diğer'), true
            FROM emergency_contacts
            WHERE phone IS NOT NULL AND phone != ''
        """))
    except Exception:
        conn.execute(sa.text("""
            INSERT INTO emergency_contacts_new (user_id, name, phone_number, relationship, is_active)
            SELECT user_id, name, COALESCE(phone, ''), 'Diğer', true
            FROM emergency_contacts
            WHERE phone IS NOT NULL AND phone != ''
        """))

    # Eski tabloyu sil, yenisini yeniden adlandır
    op.drop_table("emergency_contacts")
    op.rename_table("emergency_contacts_new", "emergency_contacts")


def downgrade() -> None:
    op.drop_table("emergency_contacts")

    # Eski tabloyu geri oluştur
    op.create_table(
        "emergency_contacts",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("phone", sa.String(length=32), nullable=True),
        sa.Column("email", sa.String(length=255), nullable=True),
        sa.Column("channel", sa.String(length=32), nullable=False, server_default="push"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_emergency_contacts_user_id", "emergency_contacts", ["user_id"], unique=False)
