"""Add trip_date to work_orders

Revision ID: 006
Revises: 005_schema_redesign
Create Date: 2026-05-11
"""

from alembic import op
import sqlalchemy as sa

revision = '006'
down_revision = '005'
branch_labels = None
depends_on = None


def upgrade() -> None:
    from sqlalchemy import inspect
    conn = op.get_bind()
    insp = inspect(conn)
    existing_tables = insp.get_table_names()

    if 'work_orders' in existing_tables:
        wo_cols = [c['name'] for c in insp.get_columns('work_orders')]
        if 'trip_date' not in wo_cols:
            op.add_column(
                'work_orders',
                sa.Column('trip_date', sa.Date(), nullable=True),
            )
            # Backfill: set trip_date = DATE(created_at) for existing rows
            op.execute(
                "UPDATE work_orders SET trip_date = DATE(created_at AT TIME ZONE 'UTC')"
            )


def downgrade() -> None:
    from sqlalchemy import inspect
    conn = op.get_bind()
    insp = inspect(conn)
    if 'work_orders' in insp.get_table_names():
        wo_cols = [c['name'] for c in insp.get_columns('work_orders')]
        if 'trip_date' in wo_cols:
            op.drop_column('work_orders', 'trip_date')
