"""add (lat, lng) compound index on locations

Revision ID: 002
Revises: 001
Create Date: 2026-05-05

The /locations/nearby endpoint pulls candidate rows with non-null
coords for the Haversine pass. Once the table grows past a few
thousand rows the seq scan starts to dominate; add a btree index on
(lat, lng) so a bbox pre-filter (lat BETWEEN ... AND lng BETWEEN ...)
can be index-only.
"""
from typing import Sequence, Union

from alembic import op


revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_index(
        "ix_locations_lat_lng",
        "locations",
        ["lat", "lng"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_locations_lat_lng", table_name="locations")
