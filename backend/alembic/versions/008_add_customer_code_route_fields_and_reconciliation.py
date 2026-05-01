"""Add customer code, route pickup/dropoff, and reconciliation fields

Revision ID: 008
Revises: 007
Create Date: 2026-05-01 06:30:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '008'
down_revision = '007'
branch_labels = None
depends_on = None


def upgrade():
    # Add code field to clients table
    op.add_column('clients', sa.Column('code', sa.String(50), nullable=True))

    # Add pickup and dropoff location fields to routes table
    op.add_column('routes', sa.Column('pickup_location', sa.String(255), nullable=True))
    op.add_column('routes', sa.Column('dropoff_location', sa.String(255), nullable=True))

    # Add reconciliation tracking to trip_orders
    op.add_column('trip_orders', sa.Column('is_confirmed', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('trip_orders', sa.Column('confirmed_by', sa.Integer(), nullable=True))
    op.add_column('trip_orders', sa.Column('confirmed_at', sa.DateTime(timezone=True), nullable=True))

    # Add indexes for better query performance
    op.create_index('ix_clients_code', 'clients', ['code'], unique=True)
    op.create_index('ix_trip_orders_is_confirmed', 'trip_orders', ['is_confirmed'])
    op.create_index('ix_trip_orders_confirmed_by', 'trip_orders', ['confirmed_by'])

    # Add foreign key constraint for confirmed_by
    op.create_foreign_key(
        'fk_trip_orders_confirmed_by_users',
        'trip_orders', 'users',
        ['confirmed_by'], ['id']
    )


def downgrade():
    # Remove foreign key and indexes
    op.drop_constraint('fk_trip_orders_confirmed_by_users', 'trip_orders', type_='foreignkey')
    op.drop_index('ix_trip_orders_confirmed_by', 'trip_orders')
    op.drop_index('ix_trip_orders_is_confirmed', 'trip_orders')
    op.drop_index('ix_clients_code', 'clients')

    # Remove columns
    op.drop_column('trip_orders', 'confirmed_at')
    op.drop_column('trip_orders', 'confirmed_by')
    op.drop_column('trip_orders', 'is_confirmed')
    op.drop_column('routes', 'dropoff_location')
    op.drop_column('routes', 'pickup_location')
    op.drop_column('clients', 'code')
