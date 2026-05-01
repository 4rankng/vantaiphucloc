"""Add contact fields to vendors table

Revision ID: 009
Revises: 008
Create Date: 2026-05-01 07:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '009'
down_revision = '008'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('vendors', sa.Column('type', sa.String(20), nullable=True))
    op.add_column('vendors', sa.Column('phone', sa.String(50), nullable=True))
    op.add_column('vendors', sa.Column('tax_code', sa.String(50), nullable=True))
    op.add_column('vendors', sa.Column('address', sa.String(500), nullable=True))
    op.add_column('vendors', sa.Column('contact_person', sa.String(255), nullable=True))


def downgrade() -> None:
    op.drop_column('vendors', 'contact_person')
    op.drop_column('vendors', 'address')
    op.drop_column('vendors', 'tax_code')
    op.drop_column('vendors', 'phone')
    op.drop_column('vendors', 'type')
