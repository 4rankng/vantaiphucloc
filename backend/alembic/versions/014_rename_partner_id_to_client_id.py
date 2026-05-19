"""Rename partner_id → client_id and vendor_partner_id → vendor_id.

Revision ID: 014
Revises: 013
Create Date: 2026-05-14
"""

from alembic import op

revision = "014"
down_revision = "013"
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    # Reverse: vendor_id → vendor_partner_id, client_id → partner_id

    # ── vendor_reconciliation_imports ───────────────────────────────────
    op.execute("DROP INDEX IF EXISTS ix_vendor_recon_imports_vendor_uploaded")
    op.alter_column("vendor_reconciliation_imports", "vendor_id", new_column_name="vendor_partner_id")
    op.execute(
        'CREATE INDEX ix_vendor_recon_imports_vendor_uploaded ON vendor_reconciliation_imports (vendor_partner_id, uploaded_at)'
    )

    # ── customer_reconciliation_imports ─────────────────────────────────
    op.execute("DROP INDEX IF EXISTS ix_customer_recon_imports_client_uploaded")
    op.alter_column("customer_reconciliation_imports", "client_id", new_column_name="partner_id")
    op.execute(
        'CREATE INDEX ix_customer_recon_imports_partner_uploaded ON customer_reconciliation_imports (partner_id, uploaded_at)'
    )

    # ── customer_import_templates ───────────────────────────────────────
    op.execute("ALTER TABLE customer_import_templates DROP CONSTRAINT IF EXISTS uq_import_templates_client_structure")
    op.alter_column("customer_import_templates", "client_id", new_column_name="partner_id")
    op.execute(
        'ALTER TABLE customer_import_templates ADD CONSTRAINT uq_import_templates_partner_structure '
        'UNIQUE (partner_id, structure_hash)'
    )

    # ── trip_orders ─────────────────────────────────────────────────────
    op.execute("DROP INDEX IF EXISTS ix_trip_orders_client_id_trip_date")
    op.alter_column("trip_orders", "client_id", new_column_name="partner_id")
    op.execute(
        'CREATE INDEX ix_trip_orders_partner_id_trip_date ON trip_orders (partner_id, trip_date)'
    )

    # ── work_orders ─────────────────────────────────────────────────────
    op.alter_column("work_orders", "vendor_id", new_column_name="vendor_partner_id")
    op.alter_column("work_orders", "client_id", new_column_name="partner_id")

    # ── pricings ────────────────────────────────────────────────────────
    op.execute("ALTER TABLE pricings DROP CONSTRAINT IF EXISTS uq_pricings_lane")
    op.alter_column("pricings", "client_id", new_column_name="partner_id")
    op.execute(
        'ALTER TABLE pricings ADD CONSTRAINT uq_pricings_lane '
        'UNIQUE (partner_id, operation_type, work_type, pickup_location_id, dropoff_location_id)'
    )
