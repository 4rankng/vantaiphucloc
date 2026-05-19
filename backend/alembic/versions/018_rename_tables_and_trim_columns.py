"""rename tables and trim columns

Rename trip_orders → booked_trips, work_orders → delivered_trips,
and associated tables. Drop unused columns, add work_type/cont_type.

Revision ID: 018_rename_tables
Revises: e2bd2b4664fc
Create Date: 2026-05-18

"""
from alembic import op
import sqlalchemy as sa

revision = "018_rename_tables"
down_revision = "e2bd2b4664fc"
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    # Reverse FK renames
    with op.batch_alter_table("matched_trips") as b:
        b.alter_column("booked_trip_id", new_column_name="trip_order_id")
        b.alter_column("delivered_trip_id", new_column_name="work_order_id")

    with op.batch_alter_table("delivered_trip_containers") as b:
        b.alter_column("delivered_trip_id", new_column_name="work_order_id")
        b.drop_column("cont_type")
        b.add_column(sa.Column("work_type", sa.String(), nullable=False, server_default="F20"))

    with op.batch_alter_table("booked_trip_containers") as b:
        b.alter_column("booked_trip_id", new_column_name="trip_order_id")
        b.drop_column("cont_type")
        b.add_column(sa.Column("work_type", sa.String(), nullable=False, server_default="F20"))

    with op.batch_alter_table("delivered_trips") as b:
        b.drop_column("revenue")
        b.drop_column("work_type")
        b.add_column(sa.Column("code", sa.String(), nullable=True))
        b.add_column(sa.Column("pricing_id", sa.Integer(), nullable=True))
        b.add_column(sa.Column("unit_price", sa.Integer(), nullable=False, server_default="0"))
        b.add_column(sa.Column("vehicle_external_plate", sa.String(), nullable=True))

    with op.batch_alter_table("booked_trips") as b:
        b.drop_column("revenue")
        b.drop_column("work_type")
        b.add_column(sa.Column("code", sa.String(), nullable=True))
        b.add_column(sa.Column("pricing_id", sa.Integer(), nullable=True))
        b.add_column(sa.Column("unit_price", sa.Integer(), nullable=False, server_default="0"))
        b.add_column(sa.Column("driver_salary", sa.Integer(), nullable=False, server_default="0"))
        b.add_column(sa.Column("allowance", sa.Integer(), nullable=False, server_default="0"))
        b.add_column(sa.Column("pickup_raw", sa.String(), nullable=True))
        b.add_column(sa.Column("dropoff_raw", sa.String(), nullable=True))
        b.add_column(sa.Column("location_review_needed", sa.Boolean(), nullable=False, server_default="false"))

    op.rename_table("matched_trips", "reconciliations")
    op.rename_table("delivered_trip_containers", "work_order_containers")
    op.rename_table("booked_trip_containers", "trip_order_containers")
    op.rename_table("delivered_trips", "work_orders")
    op.rename_table("booked_trips", "trip_orders")
