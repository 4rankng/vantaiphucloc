"""Make work_order client_id and client_name nullable.

Drivers log physical work (containers + route) without knowing the client.
The client is assigned by kế toán when creating/matching a trip order.

Revision ID: 004
Revises: 003
"""

import sqlalchemy as sa

revision = "004"
down_revision = "003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Drop the NOT NULL constraint and FK index, then re-add as nullable
    with op.batch_alter_table("work_orders") as batch_op:
        batch_op.alter_column("client_id", existing_type=sa.Integer(), nullable=True)
        batch_op.alter_column("client_name", existing_type=sa.String(255), nullable=True)


def downgrade() -> None:
    # Restore NOT NULL — will fail if any rows have NULL client_id
    with op.batch_alter_table("work_orders") as batch_op:
        batch_op.alter_column("client_id", existing_type=sa.Integer(), nullable=False)
        batch_op.alter_column("client_name", existing_type=sa.String(255), nullable=False)
