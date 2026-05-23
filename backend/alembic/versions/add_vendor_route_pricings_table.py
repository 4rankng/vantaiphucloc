"""add_vendor_route_pricings_table

Revision ID: add_vendor_route_pricings
Revises: rename_op_type_to_work_type
Create Date: 2026-05-23

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'add_vendor_route_pricings'
down_revision: Union[str, None] = 'rename_op_type_to_work_type'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'vendor_route_pricings',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('vendor_id', sa.Integer(), nullable=False),
        sa.Column('pickup_location_id', sa.Integer(), nullable=False),
        sa.Column('dropoff_location_id', sa.Integer(), nullable=False),
        sa.Column('work_type', sa.String(length=50), nullable=False),
        sa.Column('f20_price', sa.Integer(), nullable=True),
        sa.Column('f40_price', sa.Integer(), nullable=True),
        sa.Column('e20_price', sa.Integer(), nullable=True),
        sa.Column('e40_price', sa.Integer(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint(
            'vendor_id', 'pickup_location_id',
            'dropoff_location_id', 'work_type',
            name='uq_vendor_route_pricings_lane',
        ),
    )
    op.create_index(op.f('ix_vendor_route_pricings_id'), 'vendor_route_pricings', ['id'], unique=False)
    op.create_index(op.f('ix_vendor_route_pricings_vendor_id'), 'vendor_route_pricings', ['vendor_id'], unique=False)
    op.create_index(op.f('ix_vendor_route_pricings_pickup_location_id'), 'vendor_route_pricings', ['pickup_location_id'], unique=False)
    op.create_index(op.f('ix_vendor_route_pricings_dropoff_location_id'), 'vendor_route_pricings', ['dropoff_location_id'], unique=False)
    op.create_index(op.f('ix_vendor_route_pricings_work_type'), 'vendor_route_pricings', ['work_type'], unique=False)

    op.create_foreign_key(None, 'vendor_route_pricings', 'vendors', ['vendor_id'], ['id'])
    op.create_foreign_key(None, 'vendor_route_pricings', 'locations', ['pickup_location_id'], ['id'])
    op.create_foreign_key(None, 'vendor_route_pricings', 'locations', ['dropoff_location_id'], ['id'])


def downgrade() -> None:
    op.drop_table('vendor_route_pricings')
