"""add locking fields, nullable driver_id on trip_orders

Revision ID: 013
Revises: 012
Create Date: 2026-05-02 16:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = '013'
down_revision = '012'
branch_labels = None
depends_on = None


def upgrade():
    # WorkOrder locking fields
    op.add_column('work_orders', sa.Column('is_locked', sa.Boolean, nullable=False, server_default='false'))
    op.add_column('work_orders', sa.Column('locked_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('work_orders', sa.Column('locked_by', sa.Integer, sa.ForeignKey('users.id'), nullable=True))

    # TripOrder locking fields
    op.add_column('trip_orders', sa.Column('is_locked', sa.Boolean, nullable=False, server_default='false'))
    op.add_column('trip_orders', sa.Column('locked_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('trip_orders', sa.Column('locked_by', sa.Integer, sa.ForeignKey('users.id'), nullable=True))

    # Make driver_id and driver_name nullable on trip_orders
    op.alter_column('trip_orders', 'driver_id', nullable=True)
    op.alter_column('trip_orders', 'driver_name', nullable=True)


def downgrade():
    # Revert trip_orders driver fields to NOT NULL
    op.alter_column('trip_orders', 'driver_name', nullable=False)
    op.alter_column('trip_orders', 'driver_id', nullable=False)

    # Remove trip_orders locking fields
    op.drop_column('trip_orders', 'locked_by')
    op.drop_column('trip_orders', 'locked_at')
    op.drop_column('trip_orders', 'is_locked')

    # Remove work_orders locking fields
    op.drop_column('work_orders', 'locked_by')
    op.drop_column('work_orders', 'locked_at')
    op.drop_column('work_orders', 'is_locked')
