"""add FSM status columns to location_aliases

Revision ID: 004
Revises: 003
Create Date: 2026-05-10

Adds status/confirmed/rejected/merge columns to location_aliases for
the alias confirmation FSM. Backfills existing confirmed aliases.
"""
import sqlalchemy as sa
from alembic import op


revision: str = '004'
down_revision: str | None = '003'
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    op.drop_index('ix_location_aliases_status', table_name='location_aliases')
    op.drop_column('location_aliases', 'note')
    op.drop_constraint('fk_location_aliases_merge_target', 'location_aliases', type_='foreignkey')
    op.drop_column('location_aliases', 'merge_target_location_id')
    op.drop_column('location_aliases', 'rejected_at')
    op.drop_constraint('fk_location_aliases_rejected_by_id', 'location_aliases', type_='foreignkey')
    op.drop_column('location_aliases', 'rejected_by_id')
    op.drop_column('location_aliases', 'confirmed_at')
    op.drop_constraint('fk_location_aliases_confirmed_by_id', 'location_aliases', type_='foreignkey')
    op.drop_column('location_aliases', 'confirmed_by_id')
    op.drop_column('location_aliases', 'status')
