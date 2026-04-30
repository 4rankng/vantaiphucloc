"""Add trip_order_containers child table.

TripOrder now supports multiple containers via a child table,
mirroring the WorkOrderContainer pattern. Existing single-container
data is backfilled.

Revision ID: 005
Revises: 004
"""

import sqlalchemy as sa
from alembic import op

revision = "005"
down_revision = "004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Create the child table
    op.create_table(
        "trip_order_containers",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "trip_order_id",
            sa.Integer(),
            sa.ForeignKey("trip_orders.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("container_number", sa.String(50), nullable=False),
        sa.Column("work_type", sa.String(10), nullable=False),
    )

    # 2. Backfill from existing trip_orders rows
    op.execute(
        """
        INSERT INTO trip_order_containers (trip_order_id, container_number, work_type)
        SELECT id, container_number, work_type
        FROM trip_orders
        WHERE container_number IS NOT NULL AND work_type IS NOT NULL
        """
    )

    # 3. Make legacy columns nullable
    with op.batch_alter_table("trip_orders") as batch_op:
        batch_op.alter_column(
            "container_number", existing_type=sa.String(50), nullable=True
        )
        batch_op.alter_column(
            "work_type", existing_type=sa.String(10), nullable=True
        )


def downgrade() -> None:
    # Copy first container back to legacy columns
    op.execute(
        """
        UPDATE trip_orders t
        SET container_number = c.container_number,
            work_type = c.work_type
        FROM trip_order_containers c
        WHERE c.trip_order_id = t.id
        AND c.id = (
            SELECT MIN(c2.id) FROM trip_order_containers c2
            WHERE c2.trip_order_id = t.id
        )
        """
    )

    # Restore NOT NULL
    with op.batch_alter_table("trip_orders") as batch_op:
        batch_op.alter_column(
            "container_number", existing_type=sa.String(50), nullable=False
        )
        batch_op.alter_column(
            "work_type", existing_type=sa.String(10), nullable=False
        )

    op.drop_table("trip_order_containers")
