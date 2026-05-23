"""Schema cleanup: flatten containers, drop reconciliation & GPS fields.

Revision ID: 024
Revises: 023
Create Date: 2026-05-23
"""
from alembic import op
import sqlalchemy as sa

revision = '024'
down_revision = '023'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Add container fields to trip tables
    op.add_column('booked_trips', sa.Column('cont_number', sa.String(50), nullable=True))
    op.add_column('booked_trips', sa.Column('cont_type', sa.String(10), nullable=True))
    op.add_column('delivered_trips', sa.Column('cont_number', sa.String(50), nullable=True))
    op.add_column('delivered_trips', sa.Column('cont_type', sa.String(10), nullable=True))

    # 2. Migrate vehicle_id → vehicle_plate before dropping
    op.add_column('delivered_trips', sa.Column('vehicle_plate', sa.String(20), nullable=True))
    op.execute("""
        UPDATE delivered_trips d
        SET vehicle_plate = v.plate
        FROM vehicles v
        WHERE d.vehicle_id = v.id
    """)

    # 3. Drop columns
    op.drop_column('booked_trips', 'operation_type')
    op.drop_column('delivered_trips', 'operation_type')
    op.drop_column('delivered_trips', 'vehicle_id')
    op.drop_column('delivered_trips', 'gps_address')
    op.drop_column('delivered_trips', 'gps_lng')
    op.drop_column('delivered_trips', 'gps_lat')

    # 3. Drop tables (FK-safe order)
    op.drop_table('vendor_reconciliation_rows')
    op.drop_table('vendor_reconciliation_imports')
    op.drop_table('customer_reconciliation_rows')
    op.drop_table('customer_reconciliation_imports')
    op.drop_table('customer_import_templates')
    op.drop_table('matched_trips')
    op.drop_table('delivered_trip_containers')
    op.drop_table('booked_trip_containers')


def downgrade() -> None:
    # Not implemented — this is a destructive simplification.
    raise NotImplementedError("Downgrade not supported for schema cleanup migration")
