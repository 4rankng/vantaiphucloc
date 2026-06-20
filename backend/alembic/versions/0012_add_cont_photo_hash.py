"""add cont_photo_hash column

Revision ID: 0012_add_cont_photo_hash
Revises: 5240104be019
Create Date: 2026-06-18 23:40:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "0012_add_cont_photo_hash"
down_revision: Union[str, None] = "5240104be019"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "delivered_trips",
        sa.Column("cont_photo_hash", sa.String(length=64), nullable=True),
    )
    op.create_index(
        "ix_delivered_trips_cont_photo_hash",
        "delivered_trips",
        ["cont_photo_hash"],
    )


def downgrade() -> None:
    op.drop_index("ix_delivered_trips_cont_photo_hash", table_name="delivered_trips")
    op.drop_column("delivered_trips", "cont_photo_hash")
