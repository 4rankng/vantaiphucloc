"""add booked_trip_id to delivered_trips

Revision ID: add_booked_trip_fk
Revises: add_vendor_route_pricings
Create Date: 2026-05-23
"""

revision = "add_booked_trip_fk"
down_revision = "add_vendor_route_pricings"

import sqlalchemy as sa
from alembic import op


def upgrade() -> None:
    op.add_column(
        "delivered_trips",
        sa.Column("booked_trip_id", sa.Integer(), nullable=True),
    )
    op.create_index(
        "ix_delivered_trips_booked_trip_id",
        "delivered_trips",
        ["booked_trip_id"],
    )
    op.create_foreign_key(
        "fk_delivered_trips_booked_trip_id",
        "delivered_trips",
        "booked_trips",
        ["booked_trip_id"],
        ["id"],
    )


def downgrade() -> None:
    op.drop_constraint(
        "fk_delivered_trips_booked_trip_id",
        "delivered_trips",
        type_="foreignkey",
    )
    op.drop_index("ix_delivered_trips_booked_trip_id")
    op.drop_column("delivered_trips", "booked_trip_id")
