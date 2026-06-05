"""merge heads

Revision ID: 9c81f08d14c0
Revises: 0007_add_note_to_delivered_trips, 9633740b4b60
Create Date: 2026-06-05 12:25:07.998121

"""
from typing import Sequence, Union


# revision identifiers, used by Alembic.
revision: str = '9c81f08d14c0'
down_revision: Union[str, None] = ('0007_add_note_to_delivered_trips', '9633740b4b60')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
