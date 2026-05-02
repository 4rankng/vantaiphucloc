"""add is_active to clients

Revision ID: 015
Revises: 014
Create Date: 2026-05-02 12:20:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = '015'
down_revision = '014'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('clients', sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')))


def downgrade():
    op.drop_column('clients', 'is_active')
