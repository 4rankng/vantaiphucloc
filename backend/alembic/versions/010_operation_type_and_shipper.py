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
    conn = op.get_bind()
    from sqlalchemy import inspect, text
    insp = inspect(conn)

    # ── pricings ─────────────────────────────────────────────────────────────
    pricing_cols = {c["name"] for c in insp.get_columns("pricings")}

    if "shipper_partner_id" not in pricing_cols:
        op.add_column(
            "pricings",
            sa.Column("shipper_partner_id", sa.Integer(),
                      sa.ForeignKey("partners.id"), nullable=True),
        )
        op.create_index("ix_pricings_shipper_partner_id", "pricings", ["shipper_partner_id"])

    if "operation_type" not in pricing_cols:
        op.add_column(
            "pricings",
            sa.Column("operation_type", sa.String(20), nullable=True),
        )
        op.create_index("ix_pricings_operation_type", "pricings", ["operation_type"])

    # Drop old 4-col unique constraint and replace with 6-col version.
    # Use IF EXISTS to be safe against repeated runs.
    constraints = {c["name"] for c in insp.get_unique_constraints("pricings")}
    if "uq_pricings_lane" in constraints:
        op.drop_constraint("uq_pricings_lane", "pricings", type_="unique")

    # Re-create unique constraint — NULLs are distinct in Postgres so this
    # allows (partner, NULL, NULL, lane) alongside (partner, shipper, op, lane).
    conn.execute(text(
        "ALTER TABLE pricings ADD CONSTRAINT uq_pricings_lane "
        "UNIQUE NULLS NOT DISTINCT (partner_id, shipper_partner_id, operation_type, "
        "work_type, pickup_location_id, dropoff_location_id)"
    ))

    # ── work_orders ───────────────────────────────────────────────────────────
    wo_cols = {c["name"] for c in insp.get_columns("work_orders")}

    if "operation_type" not in wo_cols:
        op.add_column(
            "work_orders",
            sa.Column("operation_type", sa.String(20), nullable=True),
        )
        op.create_index("ix_work_orders_operation_type", "work_orders", ["operation_type"])

    if "shipper_partner_id" not in wo_cols:
        op.add_column(
            "work_orders",
            sa.Column("shipper_partner_id", sa.Integer(),
                      sa.ForeignKey("partners.id"), nullable=True),
        )
        op.create_index("ix_work_orders_shipper_partner_id", "work_orders", ["shipper_partner_id"])

    # ── trip_orders ───────────────────────────────────────────────────────────
    to_cols = {c["name"] for c in insp.get_columns("trip_orders")}

    if "operation_type" not in to_cols:
        op.add_column(
            "trip_orders",
            sa.Column("operation_type", sa.String(20), nullable=True),
        )
        op.create_index("ix_trip_orders_operation_type", "trip_orders", ["operation_type"])

    if "shipper_partner_id" not in to_cols:
        op.add_column(
            "trip_orders",
            sa.Column("shipper_partner_id", sa.Integer(),
                      sa.ForeignKey("partners.id"), nullable=True),
        )
        op.create_index("ix_trip_orders_shipper_partner_id", "trip_orders", ["shipper_partner_id"])


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
