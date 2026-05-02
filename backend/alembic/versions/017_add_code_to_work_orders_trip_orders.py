"""Add code column to work_orders and trip_orders

Revision ID: 017
Revises: 016
"""
from alembic import op
import sqlalchemy as sa

revision = "017"
down_revision = "016"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("work_orders", sa.Column("code", sa.String(20), nullable=True))
    op.add_column("trip_orders", sa.Column("code", sa.String(20), nullable=True))

    op.create_index("ix_work_orders_code", "work_orders", ["code"], unique=True)
    op.create_index("ix_trip_orders_code", "trip_orders", ["code"], unique=True)

    # Backfill: generate codes from client_code + sequential count per client
    conn = op.get_bind()

    # Backfill work_orders
    wo_rows = conn.execute(
        sa.text(
            "SELECT wo.id, wo.client_id, c.code AS client_code, c.name AS client_name "
            "FROM work_orders wo JOIN clients c ON wo.client_id = c.id "
            "ORDER BY wo.client_id, wo.id"
        )
    ).fetchall()

    client_wo_counts: dict[int, int] = {}
    for row in wo_rows:
        client_wo_counts.setdefault(row.client_id, 0)
        client_wo_counts[row.client_id] += 1
        seq = client_wo_counts[row.client_id]
        import re
        raw = row.client_code or row.client_name
        prefix = re.sub(r"[^A-Za-z0-9]", "", raw).upper()[:6] if raw else f"C{row.client_id}"
        code = f"{prefix}{seq:04d}"
        conn.execute(sa.text("UPDATE work_orders SET code = :code WHERE id = :id"), {"code": code, "id": row.id})

    # Backfill trip_orders
    to_rows = conn.execute(
        sa.text(
            "SELECT to2.id, to2.client_id, c.code AS client_code, c.name AS client_name "
            "FROM trip_orders to2 JOIN clients c ON to2.client_id = c.id "
            "ORDER BY to2.client_id, to2.id"
        )
    ).fetchall()

    client_to_counts: dict[int, int] = {}
    for row in to_rows:
        client_to_counts.setdefault(row.client_id, 0)
        client_to_counts[row.client_id] += 1
        seq = client_to_counts[row.client_id]
        raw = row.client_code or row.client_name
        prefix = re.sub(r"[^A-Za-z0-9]", "", raw).upper()[:6] if raw else f"C{row.client_id}"
        code = f"{prefix}{seq:04d}"
        conn.execute(sa.text("UPDATE trip_orders SET code = :code WHERE id = :id"), {"code": code, "id": row.id})


def downgrade() -> None:
    op.drop_index("ix_trip_orders_code", "trip_orders")
    op.drop_index("ix_work_orders_code", "work_orders")
    op.drop_column("trip_orders", "code")
    op.drop_column("work_orders", "code")
