"""Add customer_import_templates for the generic Excel-import pipeline.

Revision ID: 023
Revises: 022
"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB


revision = "023"
down_revision = "022"


def upgrade() -> None:
    op.create_table(
        "customer_import_templates",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("client_id", sa.Integer,
                  sa.ForeignKey("clients.id", ondelete="CASCADE"),
                  nullable=True),
        sa.Column("template_name", sa.String(255), nullable=False),
        sa.Column("structure_hash", sa.String(64), nullable=False),
        sa.Column("sheet_name", sa.String(255), nullable=False),
        sa.Column("header_row_index", sa.Integer, nullable=False),
        sa.Column("column_mapping", JSONB, nullable=False),
        sa.Column("last_used_at", sa.DateTime(timezone=True),
                  server_default=sa.text("now()"), nullable=False),
        sa.Column("last_used_by", sa.Integer,
                  sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_by_id", sa.Integer,
                  sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True),
                  server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True),
                  server_default=sa.text("now()"), nullable=False),
        sa.UniqueConstraint("client_id", "structure_hash",
                            name="uq_import_templates_client_structure"),
    )
    op.create_index(
        "ix_customer_import_templates_client_id",
        "customer_import_templates", ["client_id"],
    )
    op.create_index(
        "ix_customer_import_templates_structure_hash",
        "customer_import_templates", ["structure_hash"],
    )


def downgrade() -> None:
    op.drop_index("ix_customer_import_templates_structure_hash",
                  table_name="customer_import_templates")
    op.drop_index("ix_customer_import_templates_client_id",
                  table_name="customer_import_templates")
    op.drop_table("customer_import_templates")
