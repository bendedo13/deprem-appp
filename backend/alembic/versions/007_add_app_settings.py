"""Add app_settings table

Revision ID: 007_add_app_settings
Revises: 006_add_emergency_contact_fields
Create Date: 2026-03-07

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import func

# revision identifiers
revision = "007_add_app_settings"
down_revision = "006_add_emergency_contact_fields"
branch_labels = None
depends_on = None


DEFAULT_SETTINGS = [
    (
        "earthquake_limit",
        "20",
        "Deprem listesinde gösterilecek maksimum kayıt sayısı (Türkiye filtresi için geçerli).",
    ),
    (
        "active_sources",
        '["afad","kandilli","usgs","emsc"]',
        "Aktif deprem API kaynakları. JSON dizisi: afad, kandilli, usgs, emsc.",
    ),
    (
        "simulation_enabled",
        "false",
        "Deprem simülasyon/test modunu etkinleştirir. Gerçek kullanıcılara uyarı gönderir.",
    ),
    (
        "early_warning_enabled",
        "true",
        "Cihaz sensörü tabanlı erken uyarı sistemini etkinleştirir.",
    ),
]


def upgrade() -> None:
    op.create_table(
        "app_settings",
        sa.Column("key", sa.String(100), primary_key=True),
        sa.Column("value", sa.Text(), nullable=False),
        sa.Column("description", sa.String(500), nullable=True),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=func.now(),
            nullable=False,
        ),
    )

    # Varsayılan ayarları ekle
    op.bulk_insert(
        sa.table(
            "app_settings",
            sa.column("key", sa.String),
            sa.column("value", sa.Text),
            sa.column("description", sa.String),
        ),
        [{"key": k, "value": v, "description": d} for k, v, d in DEFAULT_SETTINGS],
    )


def downgrade() -> None:
    op.drop_table("app_settings")
