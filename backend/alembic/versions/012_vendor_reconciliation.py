"""Add vendor_reconciliation_imports + vendor_reconciliation_rows tables.

These store the Excel files external transport companies (xe ngoài) send
at month-end, listing containers they ran on Phúc Lộc's behalf.
The pipeline mirrors CustomerReconciliationImport/Row but runs
vendor-side: our WOs vs. their claimed containers.

Revision ID: 012
Revises: 011
Create Date: 2026-05-14
"""

from alembic import op
import sqlalchemy as sa

revision = "012"
down_revision = "011"
branch_labels = None
depends_on = None


def upgrade() -> None:
    from sqlalchemy import inspect

    conn = op.get_bind()
    insp = inspect(conn)
    existing = insp.get_table_names()

    json_type = sa.JSON().with_variant(
        sa.dialects.postgresql.JSONB(), "postgresql"
    )

    if "vendor_reconciliation_imports" not in existing:
        op.create_table(
            "vendor_reconciliation_imports",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column(
                "vendor_partner_id",
                sa.Integer(),
                sa.ForeignKey("partners.id"),
                nullable=False,
            ),
            sa.Column("period_from", sa.Date(), nullable=False),
            sa.Column("period_to", sa.Date(), nullable=False),
            sa.Column("source_filename", sa.String(length=500), nullable=True),
            sa.Column(
                "status",
                sa.String(length=20),
                nullable=False,
                server_default="PENDING_REVIEW",
            ),  # PENDING_REVIEW | APPLIED | DISCARDED
            sa.Column("totals", json_type, nullable=True),  # row counts by match_status
            sa.Column("notes", sa.String(length=1000), nullable=True),
            sa.Column(
                "uploaded_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("CURRENT_TIMESTAMP"),
                nullable=False,
            ),
            sa.Column(
                "uploaded_by",
                sa.Integer(),
                sa.ForeignKey("users.id"),
                nullable=True,
            ),
            sa.Column("applied_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column(
                "applied_by",
                sa.Integer(),
                sa.ForeignKey("users.id"),
                nullable=True,
            ),
        )
        op.create_index(
            "ix_vendor_recon_imports_vendor_id",
            "vendor_reconciliation_imports",
            ["vendor_partner_id"],
        )
        op.create_index(
            "ix_vendor_recon_imports_vendor_uploaded",
            "vendor_reconciliation_imports",
            ["vendor_partner_id", "uploaded_at"],
        )
        op.create_index(
            "ix_vendor_recon_imports_status",
            "vendor_reconciliation_imports",
            ["status"],
        )

    if "vendor_reconciliation_rows" not in existing:
        op.create_table(
            "vendor_reconciliation_rows",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column(
                "import_id",
                sa.Integer(),
                sa.ForeignKey(
                    "vendor_reconciliation_imports.id", ondelete="CASCADE"
                ),
                nullable=False,
            ),
            sa.Column("container_number", sa.String(length=50), nullable=True),
            sa.Column("work_type", sa.String(length=10), nullable=True),  # E20|E40|F20|F40
            sa.Column("route_text", sa.String(length=500), nullable=True),
            sa.Column("trip_date", sa.Date(), nullable=True),
            sa.Column("vendor_amount", sa.Integer(), nullable=True),  # VND
            sa.Column(
                "match_status",
                sa.String(length=20),
                nullable=False,
                server_default="VENDOR_ONLY",
            ),  # MATCHED | VENDOR_ONLY | OUR_ONLY | DISPUTED | IGNORED
            sa.Column(
                "matched_work_order_id",
                sa.Integer(),
                sa.ForeignKey("work_orders.id"),
                nullable=True,
            ),
            sa.Column("reviewer_note", sa.String(length=500), nullable=True),
        )
        op.create_index(
            "ix_vendor_recon_rows_import_id",
            "vendor_reconciliation_rows",
            ["import_id"],
        )
        op.create_index(
            "ix_vendor_recon_rows_container_number",
            "vendor_reconciliation_rows",
            ["container_number"],
        )
        op.create_index(
            "ix_vendor_recon_rows_match_status",
            "vendor_reconciliation_rows",
            ["match_status"],
        )
        op.create_index(
            "ix_vendor_recon_rows_matched_wo",
            "vendor_reconciliation_rows",
            ["matched_work_order_id"],
        )


def downgrade() -> None:
    from sqlalchemy import inspect

    conn = op.get_bind()
    insp = inspect(conn)
    existing = insp.get_table_names()
    if "vendor_reconciliation_rows" in existing:
        op.drop_table("vendor_reconciliation_rows")
    if "vendor_reconciliation_imports" in existing:
        op.drop_table("vendor_reconciliation_imports")
