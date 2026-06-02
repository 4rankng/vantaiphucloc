"""add cont_photo_url to delivered_trips

Revision ID: 0006_add_cont_photo_url
Revises: 0005_fk_ondelete_set_null
Create Date: 2026-06-02

Adds an optional column for storing the URL path of the container photo
attached to a delivered trip.  The photo is saved to local disk by
photo_storage.py and served through the /photos static mount.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0006_add_cont_photo_url"
down_revision: Union[str, None] = "0005_fk_ondelete_set_null"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "delivered_trips",
        sa.Column("cont_photo_url", sa.String(500), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("delivered_trips", "cont_photo_url")
