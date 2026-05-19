"""Add vendor_id to vehicles table.

Revision ID: 020_vehicle_vendor_id
"""
from alembic import op
import sqlalchemy as sa

revision = "020_vehicle_vendor_id"
down_revision = "019_fix_clients"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "vehicles",
        sa.Column("vendor_id", sa.Integer(), nullable=True),
    )
    op.create_index(
        "ix_vehicles_vendor_id",
        "vehicles",
        ["vendor_id"],
    )
    op.create_foreign_key(
        "fk_vehicles_vendor_id_vendors",
        "vehicles",
        "vendors",
        ["vendor_id"],
        ["id"],
    )


def downgrade() -> None:
    op.drop_constraint("fk_vehicles_vendor_id_vendors", "vehicles", type_="foreignkey")
    op.drop_index("ix_vehicles_vendor_id", table_name="vehicles")
    op.drop_column("vehicles", "vendor_id")
