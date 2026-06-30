"""add original_cont_number to delivered_trips

Revision ID: 0016_add_original_cont_number
Revises: 0015_add_ocr_driver_requests
Create Date: 2026-06-30

Snapshot of the cont_number at the moment the driver originally submits the
delivered trip. When the trip is matched to a booked trip, confirm_matches may
sync cont_number between the two rows; dispatchers can also edit it. This
immutable snapshot preserves the original OCR-derived value so the admin
dashboard can measure OCR accuracy by comparing it against the matched
BookedTrip's ground-truth container number.

Backfill: existing rows copy their current cont_number as the best-effort
original. Matched-and-synced rows may have a synced value rather than the true
OCR result — we accept that caveat for historical data.
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0016_add_original_cont_number"
down_revision: Union[str, None] = "0015_add_ocr_driver_requests"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "delivered_trips",
        sa.Column("original_cont_number", sa.String(50), nullable=True),
    )
    op.execute(
        "UPDATE delivered_trips "
        "SET original_cont_number = cont_number "
        "WHERE original_cont_number IS NULL"
    )


def downgrade() -> None:
    op.drop_column("delivered_trips", "original_cont_number")
