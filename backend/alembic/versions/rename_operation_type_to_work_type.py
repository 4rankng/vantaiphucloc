"""rename operation_type to work_type in route_pricings

Revision ID: rename_op_type_to_work_type
Revises: add_route_pricings_table
Create Date: 2026-05-23
"""
from alembic import op

revision = "rename_op_type_to_work_type"
down_revision = "a1b2c3d4e5f6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_index("ix_route_pricings_operation_type", table_name="route_pricings")
    op.drop_constraint("uq_route_pricings_lane", "route_pricings", type_="unique")
    op.alter_column(
        "route_pricings",
        "operation_type",
        new_column_name="work_type",
    )
    op.create_index(
        op.f("ix_route_pricings_work_type"),
        "route_pricings",
        ["work_type"],
        unique=False,
    )
    op.create_unique_constraint(
        "uq_route_pricings_lane",
        "route_pricings",
        ["client_id", "pickup_location_id", "dropoff_location_id", "work_type"],
    )


def downgrade() -> None:
    op.drop_constraint("uq_route_pricings_lane", "route_pricings", type_="unique")
    op.drop_index("ix_route_pricings_work_type", table_name="route_pricings")
    op.alter_column(
        "route_pricings",
        "work_type",
        new_column_name="operation_type",
    )
    op.create_index(
        op.f("ix_route_pricings_operation_type"),
        "route_pricings",
        ["operation_type"],
        unique=False,
    )
    op.create_unique_constraint(
        "uq_route_pricings_lane",
        "route_pricings",
        ["client_id", "pickup_location_id", "dropoff_location_id", "operation_type"],
    )
