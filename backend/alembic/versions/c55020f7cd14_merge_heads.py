"""merge heads

Revision ID: c55020f7cd14
Revises: 009, a0fb4f887714
Create Date: 2026-05-13 23:02:14.224919

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c55020f7cd14'
down_revision: Union[str, None] = ('009', 'a0fb4f887714')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
