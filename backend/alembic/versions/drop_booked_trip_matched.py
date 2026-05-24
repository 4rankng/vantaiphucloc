"""drop booked_trips.matched, derive from delivered_trips.booked_trip_id FK

Revision ID: drop_bt_matched
Revises: drop_dt_matched
Create Date: 2026-05-24
"""

revision = "drop_bt_matched"
down_revision = "drop_dt_matched"

import sqlalchemy as sa
from alembic import op


def upgrade() -> None:
    op.drop_index("ix_booked_trips_matched", table_name="booked_trips")
    op.drop_column("booked_trips", "matched")


def downgrade() -> None:
    op.add_column(
        "booked_trips",
        sa.Column("matched", sa.Boolean(), nullable=False, server_default="false"),
    )
    op.create_index(
        "ix_booked_trips_matched",
        "booked_trips",
        ["matched"],
    )
    op.execute(
        "UPDATE booked_trips SET matched = true "
        "WHERE id IN (SELECT booked_trip_id FROM delivered_trips WHERE booked_trip_id IS NOT NULL)"
    )
