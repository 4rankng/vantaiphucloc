"""Add vessel column to booked_trips table.

Revision ID: 021_booked_trip_vessel
"""
from alembic import op
import sqlalchemy as sa

revision = "021_booked_trip_vessel"
down_revision = "020_vehicle_vendor_id"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "booked_trips",
        sa.Column("vessel", sa.String(length=100), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("booked_trips", "vessel")
