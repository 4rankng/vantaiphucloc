"""Vendor WorkOrder support.

- work_orders.driver_id: NOT NULL → nullable (external vendor trips have no driver).
- work_orders.vendor_partner_id: nullable FK → partners (the xe ngoài company).
- work_orders.vehicle_external_plate: nullable String(20) — vendor's plate, free text.

DB-level constraint: exactly one of driver_id / vendor_partner_id is set is enforced
at the application layer (not as a DB check constraint) for portability.

Revision ID: 011
Revises: 010
Create Date: 2026-05-14
"""

from alembic import op
import sqlalchemy as sa

revision = "011"
down_revision = "010"
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    op.drop_column("work_orders", "vehicle_external_plate")
    op.drop_index("ix_work_orders_vendor_partner_id", "work_orders")
    op.drop_column("work_orders", "vendor_partner_id")
    op.alter_column("work_orders", "driver_id", nullable=False)
