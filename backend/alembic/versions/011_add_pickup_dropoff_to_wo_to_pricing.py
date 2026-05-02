"""add pickup_location dropoff_location to work_orders, trip_orders, pricings

Revision ID: 011
Revises: 010
Create Date: 2026-05-02 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = '011'
down_revision = '010'
branch_labels = None
depends_on = None


def upgrade():
    for table in ('work_orders', 'trip_orders', 'pricings'):
        op.add_column(table, sa.Column('pickup_location', sa.String(255), nullable=True))
        op.add_column(table, sa.Column('dropoff_location', sa.String(255), nullable=True))


def downgrade():
    for table in ('work_orders', 'trip_orders', 'pricings'):
        op.drop_column(table, 'dropoff_location')
        op.drop_column(table, 'pickup_location')
