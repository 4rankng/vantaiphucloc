"""add vessel to work_orders

Revision ID: a0fb4f887714
Revises: 006
Create Date: 2026-05-13 18:14:07.646996

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a0fb4f887714'
down_revision: Union[str, None] = '008'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('work_orders', sa.Column('vessel', sa.String(length=100), nullable=True))


def downgrade() -> None:
    op.drop_column('work_orders', 'vessel')
