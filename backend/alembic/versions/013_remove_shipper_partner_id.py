"""Remove shipper concept: swap partner_id, drop shipper_partner_id + partner_role.

Data migration:
  - pricings.partner_id (was PHUCLOC) → swap to actual client via shipper_partner_id
  - work_orders / trip_orders: same swap (if any rows have shipper_partner_id set)
  - partners with partner_type='shipper' → 'client' (already none, but safety net)

Schema changes:
  - Drop uq_pricings_lane unique constraint
  - Drop shipper_partner_id from pricings, work_orders, trip_orders
  - Recreate uq_pricings_lane WITHOUT shipper_partner_id
  - Drop partner_role from partners
  - Add CHECK partner_type IN ('client', 'vendor')

Revision ID: 013
Revises: 012
Create Date: 2026-05-14
"""

from alembic import op

revision = "013"
down_revision = "012"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── Data migration ──────────────────────────────────────────────────

    # 1. Any shipper-type partners → client (safety net)
    op.execute("UPDATE partners SET partner_type = 'client' WHERE partner_type = 'shipper'")

    # 2. Swap pricing partner_id: PHUCLOC → actual client (from shipper_partner_id)
    op.execute(
        "UPDATE pricings SET partner_id = shipper_partner_id "
        "WHERE shipper_partner_id IS NOT NULL"
    )

    # 3. Same for work_orders and trip_orders
    op.execute(
        "UPDATE work_orders SET partner_id = shipper_partner_id "
        "WHERE shipper_partner_id IS NOT NULL"
    )
    op.execute(
        "UPDATE trip_orders SET partner_id = shipper_partner_id "
        "WHERE shipper_partner_id IS NOT NULL"
    )

    # ── Schema changes ──────────────────────────────────────────────────

    # 4. Drop old unique constraint on pricings
    op.drop_constraint("uq_pricings_lane", "pricings", type_="unique")

    # 5. Drop shipper_partner_id columns
    op.drop_column("pricings", "shipper_partner_id")
    op.drop_column("work_orders", "shipper_partner_id")
    op.drop_column("trip_orders", "shipper_partner_id")

    # 6. Recreate unique constraint without shipper_partner_id
    op.create_unique_constraint(
        "uq_pricings_lane",
        "pricings",
        ["partner_id", "operation_type", "work_type", "pickup_location_id", "dropoff_location_id"],
    )

    # 7. Drop partner_role column
    op.drop_column("partners", "partner_role")

    # 8. Add CHECK constraint on partner_type
    op.execute(
        "ALTER TABLE partners ADD CONSTRAINT chk_partner_type "
        "CHECK (partner_type IN ('client', 'vendor'))"
    )


def downgrade() -> None:
    # ── Reverse CHECK constraint ────────────────────────────────────────
    op.execute("ALTER TABLE partners DROP CONSTRAINT IF EXISTS chk_partner_type")

    # ── Restore partner_role column ─────────────────────────────────────
    op.add_column("partners", sa_column("partner_role", sa.String(50), nullable=True))
    # Restore sensible defaults based on partner_type
    op.execute("UPDATE partners SET partner_role = 'shipping_line' WHERE partner_type = 'client'")
    op.execute("UPDATE partners SET partner_role = 'transport' WHERE partner_type = 'vendor'")

    # ── Restore shipper_partner_id columns ──────────────────────────────
    op.add_column("pricings", sa_column("shipper_partner_id", sa.Integer, nullable=True))
    op.add_column("work_orders", sa_column("shipper_partner_id", sa.Integer, nullable=True))
    op.add_column("trip_orders", sa_column("shipper_partner_id", sa.Integer, nullable=True))

    # ── Recreate old unique constraint ──────────────────────────────────
    op.drop_constraint("uq_pricings_lane", "pricings", type_="unique")
    op.create_unique_constraint(
        "uq_pricings_lane",
        "pricings",
        [
            "partner_id", "shipper_partner_id", "operation_type",
            "work_type", "pickup_location_id", "dropoff_location_id",
        ],
    )


# Needed for sa_column helper in downgrade
import sqlalchemy as sa
from sqlalchemy import Integer, String
