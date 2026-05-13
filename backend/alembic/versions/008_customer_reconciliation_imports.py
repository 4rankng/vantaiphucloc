"""Add customer_reconciliation_imports + customer_reconciliation_rows tables.

These store customer-provided reconciliation files (the customer's reply to
our monthly trip report indicating which trips they accept/reject).

Revision ID: 008
Revises: 007
Create Date: 2026-05-13
"""

from alembic import op
import sqlalchemy as sa

revision = "008"
down_revision = "007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    from sqlalchemy import inspect

    conn = op.get_bind()
    insp = inspect(conn)
    existing_tables = insp.get_table_names()

    # Use JSONB on Postgres, JSON on sqlite (tests).
    json_type = sa.JSON().with_variant(
        sa.dialects.postgresql.JSONB(), "postgresql"
    )

    if "customer_reconciliation_imports" not in existing_tables:
        op.create_table(
            "customer_reconciliation_imports",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column(
                "partner_id",
                sa.Integer(),
                sa.ForeignKey("partners.id"),
                nullable=False,
            ),
            sa.Column("period_start", sa.Date(), nullable=False),
            sa.Column("period_end", sa.Date(), nullable=False),
            sa.Column("source_filename", sa.String(length=500), nullable=True),
            sa.Column(
                "status",
                sa.String(length=20),
                nullable=False,
                server_default="PARSED",
            ),
            sa.Column("summary", json_type, nullable=True),
            sa.Column(
                "uploaded_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("CURRENT_TIMESTAMP"),
                nullable=False,
            ),
            sa.Column(
                "uploaded_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=True
            ),
            sa.Column("applied_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column(
                "applied_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=True
            ),
        )
        op.create_index(
            "ix_customer_recon_imports_partner_id",
            "customer_reconciliation_imports",
            ["partner_id"],
        )
        op.create_index(
            "ix_customer_recon_imports_partner_uploaded",
            "customer_reconciliation_imports",
            ["partner_id", "uploaded_at"],
        )

    if "customer_reconciliation_rows" not in existing_tables:
        op.create_table(
            "customer_reconciliation_rows",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column(
                "import_id",
                sa.Integer(),
                sa.ForeignKey(
                    "customer_reconciliation_imports.id", ondelete="CASCADE"
                ),
                nullable=False,
            ),
            sa.Column("container_number", sa.String(length=50), nullable=True),
            sa.Column("trip_date", sa.Date(), nullable=True),
            sa.Column("customer_status", sa.String(length=20), nullable=False),
            sa.Column("customer_note", sa.String(length=500), nullable=True),
            sa.Column(
                "resolved_trip_order_id",
                sa.Integer(),
                sa.ForeignKey("trip_orders.id"),
                nullable=True,
            ),
            sa.Column(
                "apply_status",
                sa.String(length=20),
                nullable=False,
                server_default="PENDING",
            ),
            sa.Column("apply_message", sa.String(length=500), nullable=True),
        )
        op.create_index(
            "ix_customer_recon_rows_import_id",
            "customer_reconciliation_rows",
            ["import_id"],
        )
        op.create_index(
            "ix_customer_recon_rows_container_number",
            "customer_reconciliation_rows",
            ["container_number"],
        )
        op.create_index(
            "ix_customer_recon_rows_resolved_trip_order_id",
            "customer_reconciliation_rows",
            ["resolved_trip_order_id"],
        )


def downgrade() -> None:
    from sqlalchemy import inspect

    conn = op.get_bind()
    insp = inspect(conn)
    existing = insp.get_table_names()
    if "customer_reconciliation_rows" in existing:
        op.drop_table("customer_reconciliation_rows")
    if "customer_reconciliation_imports" in existing:
        op.drop_table("customer_reconciliation_imports")
