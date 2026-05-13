"""Add vehicle_expenses and vehicle_drivers tables.

vehicle_drivers: many-to-many vehicle ↔ driver with effective dates and role
  (PRIMARY | SECONDARY). Backfilled from vehicles.driver_id.

vehicle_expenses: CP Xe cost items (xăng dầu, sửa chữa, khác, chung) used in
  per-vehicle P&L.

Revision ID: 009
Revises: 008
Create Date: 2026-05-13
"""

from alembic import op
import sqlalchemy as sa
from datetime import date

revision = "009"
down_revision = "008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    from sqlalchemy import inspect

    conn = op.get_bind()
    insp = inspect(conn)
    existing = insp.get_table_names()

    # ── vehicle_drivers ──────────────────────────────────────────────────────
    if "vehicle_drivers" not in existing:
        op.create_table(
            "vehicle_drivers",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column(
                "vehicle_id",
                sa.Integer(),
                sa.ForeignKey("vehicles.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column(
                "driver_id",
                sa.Integer(),
                sa.ForeignKey("users.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column("role", sa.String(20), nullable=False, server_default="PRIMARY"),
            sa.Column("effective_from", sa.Date(), nullable=False),
            sa.Column("effective_to", sa.Date(), nullable=True),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                nullable=False,
                server_default=sa.func.now(),
            ),
            sa.Column(
                "updated_at",
                sa.DateTime(timezone=True),
                nullable=False,
                server_default=sa.func.now(),
                onupdate=sa.func.now(),
            ),
        )
        op.create_index("ix_vehicle_drivers_vehicle_id", "vehicle_drivers", ["vehicle_id"])
        op.create_index("ix_vehicle_drivers_driver_id", "vehicle_drivers", ["driver_id"])

        # ── Backfill: one PRIMARY row per existing vehicle/driver pair ────────
        conn.execute(
            sa.text(
                """
                INSERT INTO vehicle_drivers (vehicle_id, driver_id, role, effective_from, is_active)
                SELECT id, driver_id, 'PRIMARY', :today, true
                FROM vehicles
                WHERE driver_id IS NOT NULL
                ON CONFLICT DO NOTHING
                """
            ),
            {"today": date.today()},
        )

    # ── vehicle_expenses ─────────────────────────────────────────────────────
    if "vehicle_expenses" not in existing:
        op.create_table(
            "vehicle_expenses",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column(
                "vehicle_id",
                sa.Integer(),
                sa.ForeignKey("vehicles.id", ondelete="SET NULL"),
                nullable=True,
            ),
            sa.Column("category", sa.String(20), nullable=False),
            sa.Column("amount", sa.Integer(), nullable=False),
            sa.Column("expense_date", sa.Date(), nullable=False),
            sa.Column("description", sa.String(500), nullable=True),
            sa.Column("receipt_url", sa.String(1000), nullable=True),
            sa.Column(
                "created_by",
                sa.Integer(),
                sa.ForeignKey("users.id"),
                nullable=True,
            ),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                nullable=False,
                server_default=sa.func.now(),
            ),
            sa.Column(
                "updated_at",
                sa.DateTime(timezone=True),
                nullable=False,
                server_default=sa.func.now(),
                onupdate=sa.func.now(),
            ),
        )
        op.create_index(
            "ix_vehicle_expenses_vehicle_date",
            "vehicle_expenses",
            ["vehicle_id", "expense_date"],
        )
        op.create_index(
            "ix_vehicle_expenses_category_date",
            "vehicle_expenses",
            ["category", "expense_date"],
        )


def downgrade() -> None:
    from sqlalchemy import inspect

    conn = op.get_bind()
    insp = inspect(conn)
    existing = insp.get_table_names()

    if "vehicle_expenses" in existing:
        op.drop_table("vehicle_expenses")
    if "vehicle_drivers" in existing:
        op.drop_table("vehicle_drivers")
