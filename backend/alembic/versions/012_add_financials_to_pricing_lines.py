"""add financials to pricing_lines, allow multiple lines per work_type

Revision ID: 012
Revises: 011
Create Date: 2026-05-02 11:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = '012'
down_revision = '011'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('pricing_lines', sa.Column('unit_price', sa.Integer, nullable=False, server_default='0'))
    op.add_column('pricing_lines', sa.Column('driver_salary', sa.Integer, nullable=False, server_default='0'))
    op.add_column('pricing_lines', sa.Column('allowance', sa.Integer, nullable=False, server_default='0'))
    # Drop the unique constraint if it exists
    conn = op.get_bind()
    result = conn.execute(sa.text(
        "SELECT 1 FROM information_schema.table_constraints "
        "WHERE constraint_name = 'uq_pricing_lines_pricing_work_type' AND table_name = 'pricing_lines'"
    ))
    if result.fetchone():
        op.drop_constraint('uq_pricing_lines_pricing_work_type', 'pricing_lines', type_='unique')


def downgrade():
    op.create_unique_constraint('uq_pricing_lines_pricing_work_type', 'pricing_lines', ['pricing_id', 'work_type'])
    op.drop_column('pricing_lines', 'allowance')
    op.drop_column('pricing_lines', 'driver_salary')
    op.drop_column('pricing_lines', 'unit_price')
