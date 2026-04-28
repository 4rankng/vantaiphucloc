"""add container photo metadata

Revision ID: 003
Revises: 002
Create Date: 2026-04-28

"""
from alembic import op
import sqlalchemy as sa

revision = "003"
down_revision = "002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("work_order_containers", sa.Column("photo_lat", sa.Float(), nullable=True))
    op.add_column("work_order_containers", sa.Column("photo_lng", sa.Float(), nullable=True))
    op.add_column("work_order_containers", sa.Column("photo_timestamp", sa.DateTime(timezone=True), nullable=True))
    op.add_column("work_order_containers", sa.Column("photo_address", sa.String(500), nullable=True))


def downgrade() -> None:
    op.drop_column("work_order_containers", "photo_address")
    op.drop_column("work_order_containers", "photo_timestamp")
    op.drop_column("work_order_containers", "photo_lng")
    op.drop_column("work_order_containers", "photo_lat")
