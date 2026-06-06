"""drop empty pricing tables (pricings, pricing_lines)

Revision ID: 0008_drop_pricing_tables
Revises: 9c81f08d14c0
Create Date: 2026-06-06

The `pricings` and `pricing_lines` tables were the old customer_pricing
data model that was superseded by `route_pricings`. They contained 0 rows
in production and are no longer used by any active code path.

"""
from alembic import op


revision = '0008_drop_pricing_tables'
down_revision = '9c81f08d14c0'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_table('pricing_lines')
    op.drop_table('pricings')


def downgrade() -> None:
    # Recreate tables if ever needed — schema preserved in initial_schema migration.
    pass
