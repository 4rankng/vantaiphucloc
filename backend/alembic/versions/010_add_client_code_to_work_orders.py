"""add_client_code_to_work_orders

Revision ID: 010_add_client_code_to_work_orders
Revises: 009_add_vendor_contact_fields
Create Date: 2026-05-01 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '010_add_client_code_to_work_orders'
down_revision = '009_add_vendor_contact_fields'
branch_labels = None
depends_on = None


def upgrade():
    # Add client_code column to work_orders table
    op.add_column('work_orders', sa.Column('client_code', sa.String(50), nullable=True))
    # Create index for client_code for faster lookups
    op.create_index('ix_work_orders_client_code', 'work_orders', ['client_code'])


def downgrade():
    # Remove index and column
    op.drop_index('ix_work_orders_client_code', table_name='work_orders')
    op.drop_column('work_orders', 'client_code')
