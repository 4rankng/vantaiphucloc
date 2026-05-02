"""add is_active to routes, pricings, vendors

Revision ID: 016
Revises: 015
Create Date: 2026-05-02 18:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = '016'
down_revision = '015'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('routes', sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')))
    op.add_column('pricings', sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')))
    op.add_column('vendors', sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')))


def downgrade():
    op.drop_column('vendors', 'is_active')
    op.drop_column('pricings', 'is_active')
    op.drop_column('routes', 'is_active')
