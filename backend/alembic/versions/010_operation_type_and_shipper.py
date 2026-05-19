"""Add operation_type + shipper_partner_id to WorkOrder, TripOrder, Pricing.

Pricing: drop old 4-column unique constraint, add shipper_partner_id + operation_type,
  create new 6-column constraint. NULLs are distinct in Postgres, so NULL shipper / NULL op
  are valid as fallback rows.

WorkOrder / TripOrder: add operation_type + shipper_partner_id (both nullable).

Revision ID: 010
Revises: c55020f7cd14
Create Date: 2026-05-14
"""

from alembic import op
import sqlalchemy as sa

revision = "010"
down_revision = "c55020f7cd14"
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    op.drop_index("ix_trip_orders_shipper_partner_id", "trip_orders")
    op.drop_column("trip_orders", "shipper_partner_id")
    op.drop_index("ix_trip_orders_operation_type", "trip_orders")
    op.drop_column("trip_orders", "operation_type")

    op.drop_index("ix_work_orders_shipper_partner_id", "work_orders")
    op.drop_column("work_orders", "shipper_partner_id")
    op.drop_index("ix_work_orders_operation_type", "work_orders")
    op.drop_column("work_orders", "operation_type")

    op.drop_constraint("uq_pricings_lane", "pricings", type_="unique")
    op.drop_index("ix_pricings_operation_type", "pricings")
    op.drop_column("pricings", "operation_type")
    op.drop_index("ix_pricings_shipper_partner_id", "pricings")
    op.drop_column("pricings", "shipper_partner_id")
    op.create_unique_constraint(
        "uq_pricings_lane", "pricings",
        ["partner_id", "work_type", "pickup_location_id", "dropoff_location_id"],
    )
