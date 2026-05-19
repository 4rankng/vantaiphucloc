"""split partners into clients and vendors

Revision ID: 017
Revises: 016
"""

from alembic import op

revision = "017"
down_revision = "016"


def upgrade() -> None:
    pass


def downgrade() -> None:
    op.execute(
        """
        ALTER TABLE work_orders DROP CONSTRAINT IF EXISTS work_orders_client_id_fkey;
        ALTER TABLE trip_orders DROP CONSTRAINT IF EXISTS trip_orders_client_id_fkey;
        ALTER TABLE pricings DROP CONSTRAINT IF EXISTS pricings_client_id_fkey;
        ALTER TABLE customer_reconciliation_imports DROP CONSTRAINT IF EXISTS customer_reconciliation_imports_client_id_fkey;
        ALTER TABLE customer_import_templates DROP CONSTRAINT IF EXISTS customer_import_templates_client_id_fkey;

        ALTER TABLE clients RENAME TO partners;

        ALTER TABLE work_orders ADD CONSTRAINT work_orders_client_id_fkey
            FOREIGN KEY (client_id) REFERENCES partners(id);
        ALTER TABLE trip_orders ADD CONSTRAINT trip_orders_client_id_fkey
            FOREIGN KEY (client_id) REFERENCES partners(id);
        ALTER TABLE pricings ADD CONSTRAINT pricings_client_id_fkey
            FOREIGN KEY (client_id) REFERENCES partners(id);
        ALTER TABLE customer_reconciliation_imports ADD CONSTRAINT customer_reconciliation_imports_client_id_fkey
            FOREIGN KEY (client_id) REFERENCES partners(id);
        ALTER TABLE customer_import_templates ADD CONSTRAINT customer_import_templates_client_id_fkey
            FOREIGN KEY (client_id) REFERENCES partners(id);
        """
    )

    op.execute("ALTER INDEX IF EXISTS clients_code_key RENAME TO partners_code_key;")

    op.execute(
        "ALTER TABLE partners ADD COLUMN partner_type VARCHAR(10) NOT NULL DEFAULT 'client';"
    )
    op.execute("UPDATE partners SET partner_type = 'client';")

    op.execute(
        """
        INSERT INTO partners (id, code, name, phone, tax_code, address, contact_person, is_active, created_at, updated_at, partner_type)
        SELECT id, code, name, phone, tax_code, address, contact_person, is_active, created_at, updated_at, 'vendor'
        FROM vendors;
        """
    )

    op.execute(
        """
        ALTER TABLE work_orders DROP CONSTRAINT IF EXISTS work_orders_vendor_id_fkey;
        ALTER TABLE work_orders ADD CONSTRAINT work_orders_vendor_id_fkey
            FOREIGN KEY (vendor_id) REFERENCES partners(id);

        ALTER TABLE vendor_reconciliation_imports DROP CONSTRAINT IF EXISTS vendor_reconciliation_imports_vendor_id_fkey;
        ALTER TABLE vendor_reconciliation_imports ADD CONSTRAINT vendor_reconciliation_imports_vendor_id_fkey
            FOREIGN KEY (vendor_id) REFERENCES partners(id);
        """
    )

    op.execute("DROP TABLE IF EXISTS vendors;")
