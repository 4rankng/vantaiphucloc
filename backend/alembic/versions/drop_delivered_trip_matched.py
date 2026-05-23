"""drop delivered_trips.matched, use booked_trip_id instead

Revision ID: drop_dt_matched
Revises: 62cca9e83966
Create Date: 2026-05-24
"""

revision = "drop_dt_matched"
down_revision = "62cca9e83966"

import sqlalchemy as sa
from alembic import op


def upgrade() -> None:
    op.drop_index("ix_delivered_trips_matched", table_name="delivered_trips")
    op.drop_column("delivered_trips", "matched")


def downgrade() -> None:
    op.add_column(
        "delivered_trips",
        sa.Column("matched", sa.Boolean(), nullable=False, server_default="false"),
    )
    op.create_index(
        "ix_delivered_trips_matched",
        "delivered_trips",
        ["matched"],
    )
    # Backfill: set matched = True where booked_trip_id is not null
    op.execute(
        "UPDATE delivered_trips SET matched = true WHERE booked_trip_id IS NOT NULL"
    )
