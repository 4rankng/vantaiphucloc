"""Replace status with matched boolean.

vehicle_plate and operation_type/vehicle_id removal are handled by 024.

Revision ID: 025
Revises: 024
Create Date: 2026-05-23
"""
from alembic import op
import sqlalchemy as sa

revision = '025'
down_revision = '024'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Add matched boolean (nullable first for data migration)
    op.add_column('booked_trips', sa.Column('matched', sa.Boolean(), nullable=True))
    op.add_column('delivered_trips', sa.Column('matched', sa.Boolean(), nullable=True))

    # 2. Data migration: derive matched from old status column
    op.execute("UPDATE booked_trips SET matched = (status = 'MATCHED')")
    op.execute("UPDATE delivered_trips SET matched = (status = 'MATCHED')")

    # 3. Make matched NOT NULL with default
    op.alter_column('booked_trips', 'matched', nullable=False, server_default=sa.text('false'))
    op.alter_column('delivered_trips', 'matched', nullable=False, server_default=sa.text('false'))

    # 4. Drop old status columns and indexes
    op.drop_index('ix_booked_trips_status', table_name='booked_trips')
    op.drop_column('booked_trips', 'status')

    op.drop_index('ix_delivered_trips_driver_id_status', table_name='delivered_trips')
    op.drop_index('ix_delivered_trips_status', table_name='delivered_trips')
    op.drop_column('delivered_trips', 'status')

    # 5. Add new indexes
    op.create_index('ix_delivered_trips_matched', 'delivered_trips', ['matched'])
    op.create_index('ix_booked_trips_matched', 'booked_trips', ['matched'])
    op.create_index('ix_delivered_trips_vendor_id', 'delivered_trips', ['vendor_id'])


def downgrade() -> None:
    raise NotImplementedError("Downgrade not supported for schema simplification migration")
