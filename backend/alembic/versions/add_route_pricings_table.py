"""add_route_pricings_table

Revision ID: a1b2c3d4e5f6
Revises: 07db8d7b44fb
Create Date: 2026-05-23 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '07db8d7b44fb'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'route_pricings',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('client_id', sa.Integer(), nullable=False),
        sa.Column('pickup_location_id', sa.Integer(), nullable=False),
        sa.Column('dropoff_location_id', sa.Integer(), nullable=False),
        sa.Column('operation_type', sa.String(length=50), nullable=False),
        sa.Column('f20_price', sa.Integer(), nullable=True),
        sa.Column('f40_price', sa.Integer(), nullable=True),
        sa.Column('e20_price', sa.Integer(), nullable=True),
        sa.Column('e40_price', sa.Integer(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint(
            'client_id', 'pickup_location_id',
            'dropoff_location_id', 'operation_type',
            name='uq_route_pricings_lane',
        ),
    )
    op.create_index(op.f('ix_route_pricings_id'), 'route_pricings', ['id'], unique=False)
    op.create_index(op.f('ix_route_pricings_client_id'), 'route_pricings', ['client_id'], unique=False)
    op.create_index(op.f('ix_route_pricings_pickup_location_id'), 'route_pricings', ['pickup_location_id'], unique=False)
    op.create_index(op.f('ix_route_pricings_dropoff_location_id'), 'route_pricings', ['dropoff_location_id'], unique=False)
    op.create_index(op.f('ix_route_pricings_operation_type'), 'route_pricings', ['operation_type'], unique=False)

    op.create_foreign_key(None, 'route_pricings', 'clients', ['client_id'], ['id'])
    op.create_foreign_key(None, 'route_pricings', 'locations', ['pickup_location_id'], ['id'])
    op.create_foreign_key(None, 'route_pricings', 'locations', ['dropoff_location_id'], ['id'])


def downgrade() -> None:
    op.drop_table('route_pricings')
