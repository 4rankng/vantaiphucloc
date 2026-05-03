"""Add performance indexes

Revision ID: 021
Revises: 020
"""
from alembic import op

revision = "021"
down_revision = "020"


def upgrade() -> None:
    op.create_index("ix_trip_orders_status", "trip_orders", ["status"])
    op.create_index("ix_trip_orders_trip_date", "trip_orders", ["trip_date"])
    op.create_index("ix_trip_orders_client_id_trip_date", "trip_orders", ["client_id", "trip_date"])
    op.create_index("ix_work_orders_status", "work_orders", ["status"])
    op.create_index("ix_work_orders_created_at", "work_orders", ["created_at"])
    op.create_index("ix_work_order_containers_container_number", "work_order_containers", ["container_number"])
    op.create_index("ix_trip_order_containers_container_number", "trip_order_containers", ["container_number"])


def downgrade() -> None:
    op.drop_index("ix_trip_order_containers_container_number", table_name="trip_order_containers")
    op.drop_index("ix_work_order_containers_container_number", table_name="work_order_containers")
    op.drop_index("ix_work_orders_created_at", table_name="work_orders")
    op.drop_index("ix_work_orders_status", table_name="work_orders")
    op.drop_index("ix_trip_orders_client_id_trip_date", table_name="trip_orders")
    op.drop_index("ix_trip_orders_trip_date", table_name="trip_orders")
    op.drop_index("ix_trip_orders_status", table_name="trip_orders")
