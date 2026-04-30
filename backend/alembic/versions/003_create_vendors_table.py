"""Create vendors table and seed default vendor.

Revision ID: 003
Revises: 002
"""
from alembic import op
import sqlalchemy as sa

revision = "003"
down_revision = "002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "vendors",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(255), nullable=False, unique=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_vendors_id", "vendors", ["id"])
    op.create_index("ix_vendors_name", "vendors", ["name"], unique=True)

    op.execute("INSERT INTO vendors (name) VALUES ('Phúc Lộc')")


def downgrade() -> None:
    op.drop_index("ix_vendors_name", table_name="vendors")
    op.drop_index("ix_vendors_id", table_name="vendors")
    op.drop_table("vendors")
