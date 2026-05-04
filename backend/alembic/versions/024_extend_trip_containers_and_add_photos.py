"""Extend trip_order_containers with detail fields + free-form metadata,
and add a separate trip_container_photos table for per-container imagery
(pickup, dropoff, seal, EIR, other).

Container detail fields are populated by the import pipeline (size, ISO,
F/E, weight, seal, commodity). Photos and metadata are populated later by
the driver mobile app and accountant UI.

Revision ID: 024
Revises: 023
"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB


revision = "024"
down_revision = "023"


def upgrade() -> None:
    # 1. Extend trip_order_containers with detail fields + metadata jsonb
    op.add_column(
        "trip_order_containers",
        sa.Column("container_size", sa.String(10), nullable=True),
    )
    op.add_column(
        "trip_order_containers",
        sa.Column("container_type", sa.String(20), nullable=True),
    )
    op.add_column(
        "trip_order_containers",
        sa.Column("freight_kind", sa.String(2), nullable=True),
    )
    op.add_column(
        "trip_order_containers",
        sa.Column("gross_weight_kg", sa.Numeric(10, 2), nullable=True),
    )
    op.add_column(
        "trip_order_containers",
        sa.Column("seal_no", sa.String(80), nullable=True),
    )
    op.add_column(
        "trip_order_containers",
        sa.Column("commodity", sa.String(500), nullable=True),
    )
    op.add_column(
        "trip_order_containers",
        sa.Column("container_metadata", JSONB, nullable=True),
    )

    # 2. trip_container_photos table — one row per uploaded image
    op.create_table(
        "trip_container_photos",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column(
            "trip_container_id",
            sa.Integer,
            sa.ForeignKey("trip_order_containers.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("kind", sa.String(20), nullable=False),  # pickup|dropoff|seal|eir|other
        sa.Column("file_url", sa.String(1000), nullable=False),
        sa.Column("caption", sa.String(500), nullable=True),
        sa.Column("uploaded_at", sa.DateTime(timezone=True),
                  server_default=sa.text("now()"), nullable=False),
        sa.Column("uploaded_by", sa.Integer,
                  sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True),
                  server_default=sa.text("now()"), nullable=False),
    )
    op.create_index(
        "ix_trip_container_photos_trip_container_id",
        "trip_container_photos", ["trip_container_id"],
    )
    op.create_index(
        "ix_trip_container_photos_kind",
        "trip_container_photos", ["kind"],
    )

    # 3. Cache LLM-resolved column mappings on customer_import_templates so
    #    repeated imports never re-pay the Gemini cost. We store one entry
    #    per (sha256 of header + sample values) → (canonical_field, conf).
    op.add_column(
        "customer_import_templates",
        sa.Column("llm_cache", JSONB, nullable=True),
    )


def downgrade() -> None:
    op.drop_column("customer_import_templates", "llm_cache")
    op.drop_index("ix_trip_container_photos_kind",
                  table_name="trip_container_photos")
    op.drop_index("ix_trip_container_photos_trip_container_id",
                  table_name="trip_container_photos")
    op.drop_table("trip_container_photos")
    op.drop_column("trip_order_containers", "container_metadata")
    op.drop_column("trip_order_containers", "commodity")
    op.drop_column("trip_order_containers", "seal_no")
    op.drop_column("trip_order_containers", "gross_weight_kg")
    op.drop_column("trip_order_containers", "freight_kind")
    op.drop_column("trip_order_containers", "container_type")
    op.drop_column("trip_order_containers", "container_size")
