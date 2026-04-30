"""Add full_name, cccd to users; make phone nullable.

Revision ID: 002
Revises: 001
"""
from alembic import op
import sqlalchemy as sa

revision = "002"
down_revision = "001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("full_name", sa.String(200), nullable=True))
    op.add_column("users", sa.Column("cccd", sa.String(12), nullable=True))

    # Backfill full_name from username for existing rows
    op.execute("UPDATE users SET full_name = username WHERE full_name IS NULL")

    # Make phone nullable
    op.alter_column("users", "phone", nullable=True)

    # Unique index on cccd (PostgreSQL allows multiple NULLs in unique indexes)
    op.create_index("ix_users_cccd", "users", ["cccd"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_users_cccd", table_name="users")
    op.alter_column("users", "phone", nullable=False)
    op.drop_column("users", "cccd")
    op.drop_column("users", "full_name")
