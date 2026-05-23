"""Remove operation_type from pricings, widen work_type columns.

- Drop operation_type column and its index from pricings table
- Recreate unique constraint without operation_type
- Widen work_type from VARCHAR(10) to VARCHAR(30) on all tables

Revision ID: 026
Revises: 025
Create Date: 2026-05-23
"""
from alembic import op
import sqlalchemy as sa

revision = '026'
down_revision = '025'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Drop old unique constraint that includes operation_type
    op.drop_constraint('uq_pricings_lane', 'pricings', type_='unique')

    # 2. Drop operation_type column and its index
    op.drop_index('ix_pricings_operation_type', table_name='pricings')
    op.drop_column('pricings', 'operation_type')

    # 3. Create new unique constraint without operation_type
    op.create_unique_constraint(
        'uq_pricings_lane', 'pricings',
        ['client_id', 'work_type', 'pickup_location_id', 'dropoff_location_id'],
    )

    # 4. Widen work_type columns to fit operation descriptors
    op.alter_column('pricings', 'work_type',
                    existing_type=sa.String(10), type_=sa.String(30),
                    existing_nullable=False)
    op.alter_column('booked_trips', 'work_type',
                    existing_type=sa.String(10), type_=sa.String(30),
                    existing_nullable=False)
    op.alter_column('delivered_trips', 'work_type',
                    existing_type=sa.String(10), type_=sa.String(30),
                    existing_nullable=False)


def downgrade() -> None:
    raise NotImplementedError("Downgrade not supported for schema simplification migration")
