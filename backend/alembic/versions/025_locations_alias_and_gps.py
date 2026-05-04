"""Location alias system + GPS coordinates + raw-string traceability on
TripOrder.

Bundles all location-related schema changes from the auto-create-location,
alias resolution, and driver GPS-picker tasks into one migration so the
columns land together and the resolver/seeder code can rely on them.

Includes a starter alias set for the major Vietnamese ports/yards we know
will appear across customer files.

Revision ID: 025
Revises: 024
"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy import text


revision = "025"
down_revision = "024"


# Starter aliases — major Vietnamese ports/yards seen in the customer
# sample files. The seeder scripts add many more from real data.
STARTER_LOCATIONS = [
    # canonical_name: [aliases...]
    ("Cảng Cát Lái", ["Cat Lai", "Cat Lai Port", "CL", "TCCL", "Tan Cang Cat Lai", "Cảng CL", "ICD Cát Lái"]),
    ("Cảng Hải Phòng", ["Hai Phong", "Hai Phong Port", "HP", "HPH", "VNHPH", "Cảng HP"]),
    ("ICD Sóng Thần", ["Song Than Depot", "Song Than ICD", "ST", "Sóng Thần"]),
    ("Cảng Tân Vũ", ["Tan Vu", "Tân Vũ", "TV", "Cang Tan Vu"]),
    ("Cảng Đình Vũ", ["Dinh Vu", "Đình Vũ", "DV", "VNVDV", "Cang Dinh Vu", "PTSC Đình Vũ", "PTSC"]),
    ("Cảng Nam Đình Vũ", ["Nam Dinh Vu", "NDV", "Nam Đình Vũ"]),
    ("Cảng Nam Hải Đình Vũ", ["Nam Hai Dinh Vu", "NHĐV", "NHDV", "Nam Hải Đình Vũ"]),
    ("Cảng VIP Greenport", ["VIP", "Vip Greenport", "VIP Greenport", "Greenport"]),
    ("Cảng HICT", ["HICT"]),
    ("Cảng MPC", ["MPC"]),
    ("Cảng VIMC", ["VIMC"]),
    ("Cảng Hải An", ["Hai An", "Hải An", "HẢI AN"]),
    ("Cảng HATECO", ["HATECO", "Hateco"]),
    ("Cảng PAN Hải An", ["PAN HA", "PAN", "PAN Hai An", "PAN HẢI AN"]),
    ("ICD Nam Hải", ["ICD NH", "Nam Hai ICD", "ICD Nam Hai"]),
]


def upgrade() -> None:
    # ─── locations: GPS + provenance + review flag ──────────────────────
    op.add_column("locations", sa.Column("lat", sa.Numeric(10, 7), nullable=True))
    op.add_column("locations", sa.Column("lng", sa.Numeric(10, 7), nullable=True))
    op.add_column("locations", sa.Column("geocoded_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("locations", sa.Column("geocode_source", sa.String(20), nullable=True))
    op.add_column("locations", sa.Column("pending_geocode", sa.Boolean,
                                          nullable=False, server_default=sa.text("true")))
    op.add_column("locations", sa.Column("created_via", sa.String(30), nullable=True))
    op.add_column("locations", sa.Column("created_by_id", sa.Integer,
                                          sa.ForeignKey("users.id"), nullable=True))
    op.add_column("locations", sa.Column("location_review_needed", sa.Boolean,
                                          nullable=False, server_default=sa.text("false")))
    op.create_index("ix_locations_lat_lng", "locations", ["lat", "lng"])
    op.create_index("ix_locations_pending_geocode", "locations", ["pending_geocode"])

    # ─── trip_orders: raw input + review flag ───────────────────────────
    op.add_column("trip_orders", sa.Column("pickup_raw", sa.String(500), nullable=True))
    op.add_column("trip_orders", sa.Column("dropoff_raw", sa.String(500), nullable=True))
    op.add_column("trip_orders", sa.Column("location_review_needed", sa.Boolean,
                                            nullable=False, server_default=sa.text("false")))

    # ─── location_aliases ──────────────────────────────────────────────
    op.create_table(
        "location_aliases",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("location_id", sa.Integer,
                  sa.ForeignKey("locations.id", ondelete="CASCADE"),
                  nullable=False),
        sa.Column("alias", sa.String(255), nullable=False),
        sa.Column("alias_normalized", sa.String(255), nullable=False),
        sa.Column("source", sa.String(30), nullable=False),
        # source ∈ {manual, seed, seed_confirmed, import_pending,
        #            import_confirmed, customer_order_pending,
        #            customer_order_confirmed, driver_pin}
        sa.Column("created_at", sa.DateTime(timezone=True),
                  server_default=sa.text("now()"), nullable=False),
        sa.Column("created_by_id", sa.Integer,
                  sa.ForeignKey("users.id"), nullable=True),
        sa.UniqueConstraint("alias_normalized",
                            name="uq_location_aliases_alias_normalized"),
    )
    op.create_index("ix_location_aliases_location_id",
                    "location_aliases", ["location_id"])
    op.create_index("ix_location_aliases_source",
                    "location_aliases", ["source"])

    # ─── seed: starter locations + aliases ─────────────────────────────
    bind = op.get_bind()
    for canonical, aliases in STARTER_LOCATIONS:
        existing = bind.execute(text(
            "SELECT id FROM locations WHERE name = :n"
        ), {"n": canonical}).fetchone()
        if existing is None:
            res = bind.execute(text(
                "INSERT INTO locations (name, is_active, created_at, updated_at, "
                "pending_geocode, created_via, location_review_needed) "
                "VALUES (:n, true, now(), now(), true, 'seed', false) "
                "RETURNING id"
            ), {"n": canonical})
            location_id = res.scalar_one()
        else:
            location_id = existing[0]

        for alias in aliases:
            alias_norm = _normalize(alias)
            if not alias_norm:
                continue
            already = bind.execute(text(
                "SELECT id FROM location_aliases WHERE alias_normalized = :a"
            ), {"a": alias_norm}).fetchone()
            if already is None:
                bind.execute(text(
                    "INSERT INTO location_aliases "
                    "(location_id, alias, alias_normalized, source, created_at) "
                    "VALUES (:lid, :a, :an, 'seed', now())"
                ), {"lid": location_id, "a": alias, "an": alias_norm})

    # Drop the server defaults so app-level inserts behave normally
    op.alter_column("locations", "pending_geocode", server_default=None)
    op.alter_column("locations", "location_review_needed", server_default=None)
    op.alter_column("trip_orders", "location_review_needed", server_default=None)


def downgrade() -> None:
    op.drop_index("ix_location_aliases_source", table_name="location_aliases")
    op.drop_index("ix_location_aliases_location_id", table_name="location_aliases")
    op.drop_table("location_aliases")
    op.drop_column("trip_orders", "location_review_needed")
    op.drop_column("trip_orders", "dropoff_raw")
    op.drop_column("trip_orders", "pickup_raw")
    op.drop_index("ix_locations_pending_geocode", table_name="locations")
    op.drop_index("ix_locations_lat_lng", table_name="locations")
    op.drop_column("locations", "location_review_needed")
    op.drop_column("locations", "created_by_id")
    op.drop_column("locations", "created_via")
    op.drop_column("locations", "pending_geocode")
    op.drop_column("locations", "geocode_source")
    op.drop_column("locations", "geocoded_at")
    op.drop_column("locations", "lng")
    op.drop_column("locations", "lat")


def _normalize(s: str) -> str:
    """Same logic as `app.services.import_pipeline.canonical.normalize_header_text`,
    inlined here so the migration doesn't depend on app code (which can shift
    over time)."""
    import unicodedata, re
    if s is None:
        return ""
    s = str(s)
    folded = unicodedata.normalize("NFD", s)
    folded = "".join(ch for ch in folded if not unicodedata.combining(ch))
    folded = folded.replace("đ", "d").replace("Đ", "d")
    folded = folded.lower()
    folded = re.sub(r"\s+", " ", folded).strip()
    folded = folded.replace(".", "").replace(":", "").replace("\n", " ").replace("\r", " ")
    folded = re.sub(r"\s+", " ", folded).strip()
    return folded
