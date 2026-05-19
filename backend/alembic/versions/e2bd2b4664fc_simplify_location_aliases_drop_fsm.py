"""simplify_location_aliases_drop_fsm

Drop FSM status columns from location_aliases.
Primary name is locations.name; aliases are just alternative names.

Revision ID: e2bd2b4664fc
Revises: 017
Create Date: 2026-05-17 11:38:40.326117

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'e2bd2b4664fc'
down_revision: Union[str, None] = '017'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    op.add_column('location_aliases', sa.Column('confirmed_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('location_aliases', sa.Column('rejected_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('location_aliases', sa.Column('confirmed_by_id', sa.Integer(), nullable=True))
    op.add_column('location_aliases', sa.Column('rejected_by_id', sa.Integer(), nullable=True))
    op.add_column('location_aliases', sa.Column('merge_target_location_id', sa.Integer(), nullable=True))
    op.add_column('location_aliases', sa.Column('note', sa.String(500), nullable=True))
    op.add_column('location_aliases', sa.Column('status', sa.String(20), server_default='PENDING', nullable=False))
    op.create_foreign_key('fk_location_aliases_confirmed_by_id', 'location_aliases', 'users', ['confirmed_by_id'], ['id'])
    op.create_foreign_key('fk_location_aliases_rejected_by_id', 'location_aliases', 'users', ['rejected_by_id'], ['id'])
    op.create_foreign_key('fk_location_aliases_merge_target', 'location_aliases', 'locations', ['merge_target_location_id'], ['id'])
    op.create_index('ix_location_aliases_status', 'location_aliases', ['status'])
