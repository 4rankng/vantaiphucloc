"""drop revenue column from booked_trips

Revision ID: drop_booked_trip_revenue
Revises: add_vendor_route_pricings
Create Date: 2026-05-23

"""
from alembic import op
import sqlalchemy as sa

revision = "drop_booked_trip_revenue"
down_revision = "add_vendor_route_pricings"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_column("booked_trips", "revenue")


def downgrade() -> None:
    op.add_column(
        "booked_trips",
        sa.Column("revenue", sa.Integer(), nullable=False, server_default="0"),
    )
