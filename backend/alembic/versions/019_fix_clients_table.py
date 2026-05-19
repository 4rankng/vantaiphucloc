"""fix clients/vendors tables: drop type, add missing columns

Revision ID: 019_fix_clients
Revises: 018_rename_tables
"""
from alembic import op
import sqlalchemy as sa

revision = "019_fix_clients"
down_revision = "018_rename_tables"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_column("clients", "type")
    op.alter_column("clients", "phone", nullable=True)
    op.add_column("vendors", sa.Column("code", sa.String(50), nullable=True, unique=True))
    op.drop_column("vendors", "type")


def downgrade() -> None:
    op.add_column("vendors", sa.Column("type", sa.String(20), nullable=True))
    op.drop_column("vendors", "code")
    op.alter_column("clients", "phone", nullable=False)
    op.add_column("clients", sa.Column("type", sa.String(20), nullable=False, server_default="client"))
