"""merge_add_booked_trip_fk_and_drop_revenue

Revision ID: 62cca9e83966
Revises: add_booked_trip_fk, drop_booked_trip_revenue
Create Date: 2026-05-23 23:34:55.913683

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '62cca9e83966'
down_revision: Union[str, None] = ('add_booked_trip_fk', 'drop_booked_trip_revenue')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
