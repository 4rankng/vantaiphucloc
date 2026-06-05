"""add note to delivered_trips

Revision ID: 0007_add_note_to_delivered_trips
Revises: 0006_add_cont_photo_url
Create Date: 2026-06-05

Adds an optional column for storing a driver's note on a delivered trip.
Used by drivers to annotate special circumstances (e.g. running a single
20ft container instead of a paired load) for accurate salary/freight review.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0007_add_note_to_delivered_trips"
down_revision: Union[str, None] = "0006_add_cont_photo_url"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "delivered_trips",
        sa.Column("note", sa.String(500), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("delivered_trips", "note")
