"""Update status enums for WorkOrder and TripOrder.

WorkOrder status changes:
- Old: PENDING, PRICED, MATCHED
- New: PENDING, MATCHED, COMPLETED

TripOrder status changes:
- Old: DRAFT, CONFIRMED, INVOICED, CANCELLED
- New: DRAFT, PENDING, COMPLETED, CANCELLED

Migration strategy:
- WorkOrder: PRICED → MATCHED, MATCHED → COMPLETED
- TripOrder: CONFIRMED → PENDING, INVOICED → COMPLETED

Revision ID: 006
Revises: 005
"""

import sqlalchemy as sa
from alembic import op

revision = "006"
down_revision = "005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # WorkOrder status migration
    op.execute("""
        UPDATE work_orders
        SET status = 'MATCHED'
        WHERE status = 'PRICED'
    """)

    op.execute("""
        UPDATE work_orders
        SET status = 'COMPLETED'
        WHERE status = 'MATCHED'
        AND (driver_salary > 0 OR allowance > 0)
    """)

    # TripOrder status migration
    op.execute("""
        UPDATE trip_orders
        SET status = 'PENDING'
        WHERE status = 'CONFIRMED'
    """)

    op.execute("""
        UPDATE trip_orders
        SET status = 'COMPLETED'
        WHERE status = 'INVOICED'
    """)


def downgrade() -> None:
    # Revert WorkOrder status
    op.execute("""
        UPDATE work_orders
        SET status = 'PRICED'
        WHERE status = 'MATCHED'
    """)

    op.execute("""
        UPDATE work_orders
        SET status = 'MATCHED'
        WHERE status = 'COMPLETED'
    """)

    # Revert TripOrder status
    op.execute("""
        UPDATE trip_orders
        SET status = 'CONFIRMED'
        WHERE status = 'PENDING'
    """)

    op.execute("""
        UPDATE trip_orders
        SET status = 'INVOICED'
        WHERE status = 'COMPLETED'
    """)
