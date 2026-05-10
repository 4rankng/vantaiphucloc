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
    op.add_column(
        'location_aliases',
        sa.Column('status', sa.String(20), nullable=False, server_default='PENDING'),
    )
    op.add_column(
        'location_aliases',
        sa.Column('confirmed_by_id', sa.Integer, nullable=True),
    )
    op.create_foreign_key(
        'fk_location_aliases_confirmed_by_id',
        'location_aliases', 'users',
        ['confirmed_by_id'], ['id'],
    )
    op.add_column(
        'location_aliases',
        sa.Column('confirmed_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        'location_aliases',
        sa.Column('rejected_by_id', sa.Integer, nullable=True),
    )
    op.create_foreign_key(
        'fk_location_aliases_rejected_by_id',
        'location_aliases', 'users',
        ['rejected_by_id'], ['id'],
    )
    op.add_column(
        'location_aliases',
        sa.Column('rejected_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        'location_aliases',
        sa.Column('merge_target_location_id', sa.Integer, nullable=True),
    )
    op.create_foreign_key(
        'fk_location_aliases_merge_target',
        'location_aliases', 'locations',
        ['merge_target_location_id'], ['id'],
    )
    op.add_column(
        'location_aliases',
        sa.Column('note', sa.String(500), nullable=True),
    )
    op.create_index('ix_location_aliases_status', 'location_aliases', ['status'])

    # Backfill: aliases with confirmed sources → CONFIRMED status.
    op.execute(
        "UPDATE location_aliases SET status = 'CONFIRMED', confirmed_at = created_at "
        "WHERE source IN ('seed_confirmed', 'import_confirmed', 'manual_confirmed')"
    )


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
