"""Add locations table and FK columns to routes, work_orders, trip_orders, pricings

Revision ID: 022
Revises: 021
"""
import sqlalchemy as sa
from alembic import op

revision = "022"
down_revision = "021"

# Canonical location names (with province suffix where applicable)
CANONICAL_LOCATIONS = [
    "ICD Cát Lái",
    "KCN Biên Hòa, Đồng Nai",
    "KCN Lê Minh Xuân, Q.12",
    "KCN Mỹ Phước, Bình Dương",
    "KCN Phước Đông, Tây Ninh",
    "Sân bay Long Thành",
]

# Short-name → canonical mapping for deduplication
DEDUP_MAP = {
    "KCN Biên Hòa": "KCN Biên Hòa, Đồng Nai",
    "KCN Mỹ Phước": "KCN Mỹ Phước, Bình Dương",
}

TABLES = ["routes", "work_orders", "trip_orders", "pricings"]


def upgrade() -> None:
    # 1. Create locations table
    op.create_table(
        "locations",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(255), nullable=False, unique=True),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.text("true")),
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
        ),
    )
    op.create_index("ix_locations_id", "locations", ["id"])
    op.create_index("ix_locations_name", "locations", ["name"], unique=True)

    # 2. Seed canonical locations
    op.bulk_insert(
        sa.table("locations", sa.column("name", sa.String)),
        [{"name": name} for name in CANONICAL_LOCATIONS],
    )

    # 3. Add FK columns to all tables
    for table in TABLES:
        op.add_column(
            table,
            sa.Column("pickup_location_id", sa.Integer(), nullable=True),
        )
        op.add_column(
            table,
            sa.Column("dropoff_location_id", sa.Integer(), nullable=True),
        )
        op.create_foreign_key(
            f"fk_{table}_pickup_location_id",
            table,
            "locations",
            ["pickup_location_id"],
            ["id"],
        )
        op.create_foreign_key(
            f"fk_{table}_dropoff_location_id",
            table,
            "locations",
            ["dropoff_location_id"],
            ["id"],
        )
        op.create_index(
            f"ix_{table}_pickup_location_id",
            table,
            ["pickup_location_id"],
        )
        op.create_index(
            f"ix_{table}_dropoff_location_id",
            table,
            ["dropoff_location_id"],
        )

    # 4. Normalize strings and backfill FKs
    conn = op.get_bind()

    # Normalize short-name variants to canonical names
    for short, canonical in DEDUP_MAP.items():
        for table in TABLES:
            for col in ["pickup_location", "dropoff_location"]:
                conn.execute(
                    sa.text(
                        f"UPDATE {table} SET {col} = :canonical WHERE {col} = :short"
                    ),
                    {"canonical": canonical, "short": short},
                )

    # Backfill FKs from normalized strings
    for table in TABLES:
        for col, fk_col in [
            ("pickup_location", "pickup_location_id"),
            ("dropoff_location", "dropoff_location_id"),
        ]:
            conn.execute(
                sa.text(
                    f"UPDATE {table} t SET {fk_col} = l.id "
                    f"FROM locations l WHERE l.name = t.{col}"
                )
            )


def downgrade() -> None:
    for table in TABLES:
        op.drop_index(f"ix_{table}_dropoff_location_id", table_name=table)
        op.drop_index(f"ix_{table}_pickup_location_id", table_name=table)
        op.drop_constraint(f"fk_{table}_dropoff_location_id", table)
        op.drop_constraint(f"fk_{table}_pickup_location_id", table)
        op.drop_column(table, "dropoff_location_id")
        op.drop_column(table, "pickup_location_id")

    op.drop_index("ix_locations_name", table_name="locations")
    op.drop_index("ix_locations_id", table_name="locations")
    op.drop_table("locations")
