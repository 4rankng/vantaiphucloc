"""add vendor column to users

Revision ID: 005
Revises: 004
Create Date: 2026-04-28

"""
from alembic import op
import sqlalchemy as sa

revision = "005"
down_revision = "004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("vendor", sa.String(255), nullable=True))
    op.create_index("ix_users_vendor", "users", ["vendor"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_users_vendor", "users")
    op.drop_column("users", "vendor")
