"""Drop tractor_plate, driver_id, driver_name from trip_orders

Revision ID: 020
Revises: 019
"""
from alembic import op
import sqlalchemy as sa

revision = "020"
down_revision = "019"


def upgrade() -> None:
    op.drop_index("ix_trip_orders_driver_id_trip_date", table_name="trip_orders")
    op.drop_constraint("trip_orders_driver_id_fkey", "trip_orders", type_="foreignkey")
    op.drop_column("trip_orders", "driver_name")
    op.drop_column("trip_orders", "driver_id")
    op.drop_column("trip_orders", "tractor_plate")


def downgrade() -> None:
    op.add_column("trip_orders", sa.Column("tractor_plate", sa.String(20), nullable=True))
    op.add_column("trip_orders", sa.Column("driver_id", sa.Integer(), nullable=True))
    op.add_column("trip_orders", sa.Column("driver_name", sa.String(255), nullable=True))
    op.create_foreign_key("trip_orders_driver_id_fkey", "trip_orders", "users", ["driver_id"], ["id"])
    op.create_index("ix_trip_orders_driver_id_trip_date", "trip_orders", ["driver_id", "trip_date"])
