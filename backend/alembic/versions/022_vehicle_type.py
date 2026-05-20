"""Add vehicle_type to vehicles table.

Revision ID: 022_vehicle_type
Revises: 021_booked_trip_vessel
"""
from alembic import op
import sqlalchemy as sa

revision = "022_vehicle_type"
down_revision = "021_booked_trip_vessel"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "vehicles",
        sa.Column("vehicle_type", sa.String(50), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("vehicles", "vehicle_type")
