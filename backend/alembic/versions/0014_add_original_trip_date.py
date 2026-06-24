"""add original_trip_date to delivered_trips

Revision ID: 0014_add_original_trip_date
Revises: 0013_add_ocr_requests
Create Date: 2026-06-24

Snapshot of the trip_date at the moment the driver originally submits the
delivered trip. When the trip is matched to a booked trip, the dialog may
overwrite trip_date with the client-side value; on "bo ghep" we restore from
this snapshot so the driver-side date is not lost.

Backfill: existing rows copy their current trip_date as the best-effort
original. Rows that have been previously matched and then unmatched may not
have a true original date anymore — we accept that data loss.
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0014_add_original_trip_date"
down_revision: Union[str, None] = "0013_add_ocr_requests"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "delivered_trips",
        sa.Column("original_trip_date", sa.Date(), nullable=True),
    )
    op.execute(
        "UPDATE delivered_trips "
        "SET original_trip_date = trip_date "
        "WHERE original_trip_date IS NULL"
    )


def downgrade() -> None:
    op.drop_column("delivered_trips", "original_trip_date")