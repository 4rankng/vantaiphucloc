"""add vehicle_plate to booked_trips

Revision ID: 023
Revises: 022_vehicle_type
Create Date: 2026-05-22
"""
from alembic import op
import sqlalchemy as sa

revision = '023'
down_revision = '022_vehicle_type'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('booked_trips', sa.Column('vehicle_plate', sa.String(50), nullable=True))


def downgrade() -> None:
    op.drop_column('booked_trips', 'vehicle_plate')
