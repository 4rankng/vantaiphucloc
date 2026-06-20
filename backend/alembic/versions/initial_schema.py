"""initial_schema

Revision ID: 0001_initial
Revises:
Create Date: 2026-05-24

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "clients",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("code", sa.String(length=50), nullable=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("phone", sa.String(length=50), nullable=True),
        sa.Column("tax_code", sa.String(length=50), nullable=True),
        sa.Column("address", sa.String(length=500), nullable=True),
        sa.Column("contact_person", sa.String(length=255), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_clients_code"), "clients", ["code"], unique=True)
    op.create_index(op.f("ix_clients_id"), "clients", ["id"], unique=False)
    op.create_index(op.f("ix_clients_name"), "clients", ["name"], unique=False)

    op.create_table(
        "settings",
        sa.Column("key", sa.String(length=100), nullable=False),
        sa.Column("value", sa.String(length=500), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("key"),
    )

    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("phone", sa.String(length=20), nullable=True),
        sa.Column("email", sa.String(length=255), nullable=True),
        sa.Column("username", sa.String(length=100), nullable=False),
        sa.Column("full_name", sa.String(length=200), nullable=True),
        sa.Column("cccd", sa.String(length=12), nullable=True),
        sa.Column("hashed_password", sa.String(length=255), nullable=False),
        sa.Column("role", sa.String(length=20), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_users_cccd"), "users", ["cccd"], unique=True)
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)
    op.create_index(op.f("ix_users_id"), "users", ["id"], unique=False)
    op.create_index(op.f("ix_users_phone"), "users", ["phone"], unique=True)
    op.create_index(op.f("ix_users_username"), "users", ["username"], unique=False)

    op.create_table(
        "vendors",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("code", sa.String(length=50), nullable=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("phone", sa.String(length=50), nullable=True),
        sa.Column("tax_code", sa.String(length=50), nullable=True),
        sa.Column("address", sa.String(length=500), nullable=True),
        sa.Column("contact_person", sa.String(length=255), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_vendors_code"), "vendors", ["code"], unique=True)
    op.create_index(op.f("ix_vendors_id"), "vendors", ["id"], unique=False)
    op.create_index(op.f("ix_vendors_name"), "vendors", ["name"], unique=False)

    op.create_table(
        "audit_logs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("action", sa.String(length=20), nullable=False),
        sa.Column("table_name", sa.String(length=100), nullable=False),
        sa.Column("record_id", sa.Integer(), nullable=False),
        sa.Column("old_value", sa.Text(), nullable=True),
        sa.Column("new_value", sa.Text(), nullable=True),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_audit_logs_action"), "audit_logs", ["action"], unique=False
    )
    op.create_index(
        op.f("ix_audit_logs_created_at"), "audit_logs", ["created_at"], unique=False
    )
    op.create_index(op.f("ix_audit_logs_id"), "audit_logs", ["id"], unique=False)
    op.create_index(
        op.f("ix_audit_logs_table_name"), "audit_logs", ["table_name"], unique=False
    )
    op.create_index(
        op.f("ix_audit_logs_user_id"), "audit_logs", ["user_id"], unique=False
    )

    op.create_table(
        "driver_salary_configs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("driver_id", sa.Integer(), nullable=False),
        sa.Column("base_salary", sa.Integer(), nullable=False),
        sa.Column("effective_from", sa.Date(), nullable=False),
        sa.Column("note", sa.String(length=500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_by", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"]),
        sa.ForeignKeyConstraint(["driver_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "driver_id",
            "effective_from",
            name="uq_driver_salary_configs_driver_effective",
        ),
    )
    op.create_index(
        "ix_driver_salary_configs_driver_effective_desc",
        "driver_salary_configs",
        ["driver_id", "effective_from"],
        unique=False,
    )
    op.create_index(
        op.f("ix_driver_salary_configs_driver_id"),
        "driver_salary_configs",
        ["driver_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_driver_salary_configs_id"),
        "driver_salary_configs",
        ["id"],
        unique=False,
    )

    op.create_table(
        "locations",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("lat", sa.Float(), nullable=True),
        sa.Column("lng", sa.Float(), nullable=True),
        sa.Column("geocoded_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("geocode_source", sa.String(length=20), nullable=True),
        sa.Column("pending_geocode", sa.Boolean(), nullable=False),
        sa.Column("created_via", sa.String(length=30), nullable=True),
        sa.Column("created_by_id", sa.Integer(), nullable=True),
        sa.Column("location_review_needed", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["created_by_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_locations_id"), "locations", ["id"], unique=False)
    op.create_index("ix_locations_lat_lng", "locations", ["lat", "lng"], unique=False)
    op.create_index(op.f("ix_locations_name"), "locations", ["name"], unique=True)

    op.create_table(
        "push_subscriptions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("endpoint", sa.String(length=500), nullable=False),
        sa.Column("p256dh", sa.String(length=200), nullable=False),
        sa.Column("auth", sa.String(length=100), nullable=False),
        sa.Column("user_agent", sa.String(length=500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_push_subscriptions_id"), "push_subscriptions", ["id"], unique=False
    )
    op.create_index(
        op.f("ix_push_subscriptions_user_id"),
        "push_subscriptions",
        ["user_id"],
        unique=False,
    )

    op.create_table(
        "vehicles",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("plate", sa.String(length=20), nullable=False),
        sa.Column("driver_id", sa.Integer(), nullable=True),
        sa.Column("vendor_id", sa.Integer(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["driver_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["vendor_id"], ["vendors.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_vehicles_driver_id"), "vehicles", ["driver_id"], unique=False
    )
    op.create_index(op.f("ix_vehicles_id"), "vehicles", ["id"], unique=False)
    op.create_index(op.f("ix_vehicles_plate"), "vehicles", ["plate"], unique=True)
    op.create_index(
        op.f("ix_vehicles_vendor_id"), "vehicles", ["vendor_id"], unique=False
    )

    op.create_table(
        "booked_trips",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("trip_date", sa.Date(), nullable=False),
        sa.Column("client_id", sa.Integer(), nullable=False),
        sa.Column("pickup_location_id", sa.Integer(), nullable=False),
        sa.Column("dropoff_location_id", sa.Integer(), nullable=False),
        sa.Column("vessel", sa.String(length=100), nullable=True),
        sa.Column("vehicle_plate", sa.String(length=50), nullable=True),
        sa.Column("work_type", sa.String(length=30), nullable=False),
        sa.Column("cont_number", sa.String(length=50), nullable=True),
        sa.Column("cont_type", sa.String(length=10), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["client_id"], ["clients.id"]),
        sa.ForeignKeyConstraint(["dropoff_location_id"], ["locations.id"]),
        sa.ForeignKeyConstraint(["pickup_location_id"], ["locations.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_booked_trips_client_id"), "booked_trips", ["client_id"], unique=False
    )
    op.create_index(
        "ix_booked_trips_client_id_trip_date",
        "booked_trips",
        ["client_id", "trip_date"],
        unique=False,
    )
    op.create_index(
        op.f("ix_booked_trips_cont_number"),
        "booked_trips",
        ["cont_number"],
        unique=False,
    )
    op.create_index(
        op.f("ix_booked_trips_dropoff_location_id"),
        "booked_trips",
        ["dropoff_location_id"],
        unique=False,
    )
    op.create_index(op.f("ix_booked_trips_id"), "booked_trips", ["id"], unique=False)
    op.create_index(
        op.f("ix_booked_trips_pickup_location_id"),
        "booked_trips",
        ["pickup_location_id"],
        unique=False,
    )
    op.create_index(
        "ix_booked_trips_trip_date", "booked_trips", ["trip_date"], unique=False
    )

    op.create_table(
        "delivered_trips",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("client_id", sa.Integer(), nullable=False),
        sa.Column("pickup_location_id", sa.Integer(), nullable=False),
        sa.Column("dropoff_location_id", sa.Integer(), nullable=False),
        sa.Column("driver_id", sa.Integer(), nullable=True),
        sa.Column("vendor_id", sa.Integer(), nullable=True),
        sa.Column("vessel", sa.String(length=100), nullable=True),
        sa.Column("work_type", sa.String(length=30), nullable=False),
        sa.Column("cont_number", sa.String(length=50), nullable=True),
        sa.Column("cont_type", sa.String(length=10), nullable=True),
        sa.Column("vehicle_plate", sa.String(length=20), nullable=True),
        sa.Column("booked_trip_id", sa.Integer(), nullable=True),
        sa.Column("revenue", sa.Integer(), nullable=False),
        sa.Column("driver_salary", sa.Integer(), nullable=False),
        sa.Column("allowance", sa.Integer(), nullable=False),
        sa.Column("trip_date", sa.Date(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["booked_trip_id"], ["booked_trips.id"]),
        sa.ForeignKeyConstraint(["client_id"], ["clients.id"]),
        sa.ForeignKeyConstraint(["driver_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["dropoff_location_id"], ["locations.id"]),
        sa.ForeignKeyConstraint(["pickup_location_id"], ["locations.id"]),
        sa.ForeignKeyConstraint(["vendor_id"], ["vendors.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_delivered_trips_booked_trip_id"),
        "delivered_trips",
        ["booked_trip_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_delivered_trips_client_id"),
        "delivered_trips",
        ["client_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_delivered_trips_cont_number"),
        "delivered_trips",
        ["cont_number"],
        unique=False,
    )
    op.create_index(
        "ix_delivered_trips_created_at", "delivered_trips", ["created_at"], unique=False
    )
    op.create_index(
        op.f("ix_delivered_trips_driver_id"),
        "delivered_trips",
        ["driver_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_delivered_trips_dropoff_location_id"),
        "delivered_trips",
        ["dropoff_location_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_delivered_trips_id"), "delivered_trips", ["id"], unique=False
    )
    op.create_index(
        op.f("ix_delivered_trips_pickup_location_id"),
        "delivered_trips",
        ["pickup_location_id"],
        unique=False,
    )
    op.create_index(
        "ix_delivered_trips_vendor_id", "delivered_trips", ["vendor_id"], unique=False
    )

    op.create_table(
        "location_aliases",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("location_id", sa.Integer(), nullable=False),
        sa.Column("alias", sa.String(length=255), nullable=False),
        sa.Column("alias_normalized", sa.String(length=255), nullable=False),
        sa.Column("source", sa.String(length=30), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_by_id", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(["created_by_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["location_id"], ["locations.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("alias_normalized"),
    )
    op.create_index(
        op.f("ix_location_aliases_id"), "location_aliases", ["id"], unique=False
    )
    op.create_index(
        op.f("ix_location_aliases_location_id"),
        "location_aliases",
        ["location_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_location_aliases_source"), "location_aliases", ["source"], unique=False
    )

    op.create_table(
        "pricings",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("client_id", sa.Integer(), nullable=False),
        sa.Column("work_type", sa.String(length=30), nullable=False),
        sa.Column("pickup_location_id", sa.Integer(), nullable=False),
        sa.Column("dropoff_location_id", sa.Integer(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["client_id"], ["clients.id"]),
        sa.ForeignKeyConstraint(["dropoff_location_id"], ["locations.id"]),
        sa.ForeignKeyConstraint(["pickup_location_id"], ["locations.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "client_id",
            "work_type",
            "pickup_location_id",
            "dropoff_location_id",
            name="uq_pricings_lane",
        ),
    )
    op.create_index(
        op.f("ix_pricings_client_id"), "pricings", ["client_id"], unique=False
    )
    op.create_index(
        op.f("ix_pricings_dropoff_location_id"),
        "pricings",
        ["dropoff_location_id"],
        unique=False,
    )
    op.create_index(op.f("ix_pricings_id"), "pricings", ["id"], unique=False)
    op.create_index(
        op.f("ix_pricings_pickup_location_id"),
        "pricings",
        ["pickup_location_id"],
        unique=False,
    )

    op.create_table(
        "route_pricings",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("client_id", sa.Integer(), nullable=False),
        sa.Column("pickup_location_id", sa.Integer(), nullable=False),
        sa.Column("dropoff_location_id", sa.Integer(), nullable=False),
        sa.Column("work_type", sa.String(length=50), nullable=False),
        sa.Column("f20_price", sa.Integer(), nullable=True),
        sa.Column("f40_price", sa.Integer(), nullable=True),
        sa.Column("e20_price", sa.Integer(), nullable=True),
        sa.Column("e40_price", sa.Integer(), nullable=True),
        sa.Column("f20_driver_salary", sa.Integer(), nullable=True),
        sa.Column("f40_driver_salary", sa.Integer(), nullable=True),
        sa.Column("e20_driver_salary", sa.Integer(), nullable=True),
        sa.Column("e40_driver_salary", sa.Integer(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "client_id",
            "pickup_location_id",
            "dropoff_location_id",
            "work_type",
            name="uq_route_pricings_lane",
        ),
    )
    op.create_index(
        op.f("ix_route_pricings_id"), "route_pricings", ["id"], unique=False
    )
    op.create_index(
        op.f("ix_route_pricings_client_id"),
        "route_pricings",
        ["client_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_route_pricings_pickup_location_id"),
        "route_pricings",
        ["pickup_location_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_route_pricings_dropoff_location_id"),
        "route_pricings",
        ["dropoff_location_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_route_pricings_work_type"),
        "route_pricings",
        ["work_type"],
        unique=False,
    )
    op.create_foreign_key(None, "route_pricings", "clients", ["client_id"], ["id"])
    op.create_foreign_key(
        None, "route_pricings", "locations", ["pickup_location_id"], ["id"]
    )
    op.create_foreign_key(
        None, "route_pricings", "locations", ["dropoff_location_id"], ["id"]
    )

    op.create_table(
        "vendor_route_pricings",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("vendor_id", sa.Integer(), nullable=False),
        sa.Column("pickup_location_id", sa.Integer(), nullable=False),
        sa.Column("dropoff_location_id", sa.Integer(), nullable=False),
        sa.Column("work_type", sa.String(length=50), nullable=False),
        sa.Column("f20_price", sa.Integer(), nullable=True),
        sa.Column("f40_price", sa.Integer(), nullable=True),
        sa.Column("e20_price", sa.Integer(), nullable=True),
        sa.Column("e40_price", sa.Integer(), nullable=True),
        sa.Column(
            "is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "vendor_id",
            "pickup_location_id",
            "dropoff_location_id",
            "work_type",
            name="uq_vendor_route_pricings_lane",
        ),
    )
    op.create_index(
        op.f("ix_vendor_route_pricings_id"),
        "vendor_route_pricings",
        ["id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_vendor_route_pricings_vendor_id"),
        "vendor_route_pricings",
        ["vendor_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_vendor_route_pricings_pickup_location_id"),
        "vendor_route_pricings",
        ["pickup_location_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_vendor_route_pricings_dropoff_location_id"),
        "vendor_route_pricings",
        ["dropoff_location_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_vendor_route_pricings_work_type"),
        "vendor_route_pricings",
        ["work_type"],
        unique=False,
    )
    op.create_foreign_key(
        None, "vendor_route_pricings", "vendors", ["vendor_id"], ["id"]
    )
    op.create_foreign_key(
        None, "vendor_route_pricings", "locations", ["pickup_location_id"], ["id"]
    )
    op.create_foreign_key(
        None, "vendor_route_pricings", "locations", ["dropoff_location_id"], ["id"]
    )

    op.create_table(
        "vehicle_drivers",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("vehicle_id", sa.Integer(), nullable=False),
        sa.Column("driver_id", sa.Integer(), nullable=False),
        sa.Column("effective_from", sa.Date(), nullable=False),
        sa.Column("effective_to", sa.Date(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["driver_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["vehicle_id"], ["vehicles.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_vehicle_drivers_driver_id"),
        "vehicle_drivers",
        ["driver_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_vehicle_drivers_id"), "vehicle_drivers", ["id"], unique=False
    )
    op.create_index(
        op.f("ix_vehicle_drivers_vehicle_id"),
        "vehicle_drivers",
        ["vehicle_id"],
        unique=False,
    )

    op.create_table(
        "vehicle_expenses",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("vehicle_id", sa.Integer(), nullable=True),
        sa.Column("category", sa.String(length=20), nullable=False),
        sa.Column("amount", sa.Integer(), nullable=False),
        sa.Column("expense_date", sa.Date(), nullable=False),
        sa.Column("description", sa.String(length=500), nullable=True),
        sa.Column("receipt_url", sa.String(length=1000), nullable=True),
        sa.Column("created_by", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"]),
        sa.ForeignKeyConstraint(["vehicle_id"], ["vehicles.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_vehicle_expenses_category"),
        "vehicle_expenses",
        ["category"],
        unique=False,
    )
    op.create_index(
        "ix_vehicle_expenses_category_date",
        "vehicle_expenses",
        ["category", "expense_date"],
        unique=False,
    )
    op.create_index(
        op.f("ix_vehicle_expenses_expense_date"),
        "vehicle_expenses",
        ["expense_date"],
        unique=False,
    )
    op.create_index(
        op.f("ix_vehicle_expenses_id"), "vehicle_expenses", ["id"], unique=False
    )
    op.create_index(
        "ix_vehicle_expenses_vehicle_date",
        "vehicle_expenses",
        ["vehicle_id", "expense_date"],
        unique=False,
    )
    op.create_index(
        op.f("ix_vehicle_expenses_vehicle_id"),
        "vehicle_expenses",
        ["vehicle_id"],
        unique=False,
    )

    op.create_table(
        "pricing_lines",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("pricing_id", sa.Integer(), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("unit_price", sa.Integer(), nullable=False),
        sa.Column("driver_salary", sa.Integer(), nullable=False),
        sa.Column("allowance", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["pricing_id"], ["pricings.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_pricing_lines_id"), "pricing_lines", ["id"], unique=False)
    op.create_index(
        op.f("ix_pricing_lines_pricing_id"),
        "pricing_lines",
        ["pricing_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_pricing_lines_pricing_id"), table_name="pricing_lines")
    op.drop_index(op.f("ix_pricing_lines_id"), table_name="pricing_lines")
    op.drop_table("pricing_lines")

    op.drop_index(op.f("ix_vehicle_expenses_vehicle_id"), table_name="vehicle_expenses")
    op.drop_index("ix_vehicle_expenses_vehicle_date", table_name="vehicle_expenses")
    op.drop_index(op.f("ix_vehicle_expenses_id"), table_name="vehicle_expenses")
    op.drop_index(
        op.f("ix_vehicle_expenses_expense_date"), table_name="vehicle_expenses"
    )
    op.drop_index("ix_vehicle_expenses_category_date", table_name="vehicle_expenses")
    op.drop_index(op.f("ix_vehicle_expenses_category"), table_name="vehicle_expenses")
    op.drop_table("vehicle_expenses")

    op.drop_index(op.f("ix_vehicle_drivers_vehicle_id"), table_name="vehicle_drivers")
    op.drop_index(op.f("ix_vehicle_drivers_id"), table_name="vehicle_drivers")
    op.drop_index(op.f("ix_vehicle_drivers_driver_id"), table_name="vehicle_drivers")
    op.drop_table("vehicle_drivers")

    op.drop_index(
        op.f("ix_vendor_route_pricings_work_type"), table_name="vendor_route_pricings"
    )
    op.drop_index(
        op.f("ix_vendor_route_pricings_dropoff_location_id"),
        table_name="vendor_route_pricings",
    )
    op.drop_index(
        op.f("ix_vendor_route_pricings_pickup_location_id"),
        table_name="vendor_route_pricings",
    )
    op.drop_index(
        op.f("ix_vendor_route_pricings_vendor_id"), table_name="vendor_route_pricings"
    )
    op.drop_index(
        op.f("ix_vendor_route_pricings_id"), table_name="vendor_route_pricings"
    )
    op.drop_table("vendor_route_pricings")

    op.drop_index(op.f("ix_route_pricings_work_type"), table_name="route_pricings")
    op.drop_index(
        op.f("ix_route_pricings_dropoff_location_id"), table_name="route_pricings"
    )
    op.drop_index(
        op.f("ix_route_pricings_pickup_location_id"), table_name="route_pricings"
    )
    op.drop_index(op.f("ix_route_pricings_client_id"), table_name="route_pricings")
    op.drop_index(op.f("ix_route_pricings_id"), table_name="route_pricings")
    op.drop_table("route_pricings")

    op.drop_index(op.f("ix_pricings_pickup_location_id"), table_name="pricings")
    op.drop_index(op.f("ix_pricings_id"), table_name="pricings")
    op.drop_index(op.f("ix_pricings_dropoff_location_id"), table_name="pricings")
    op.drop_index(op.f("ix_pricings_client_id"), table_name="pricings")
    op.drop_table("pricings")

    op.drop_index(op.f("ix_location_aliases_source"), table_name="location_aliases")
    op.drop_index(
        op.f("ix_location_aliases_location_id"), table_name="location_aliases"
    )
    op.drop_index(op.f("ix_location_aliases_id"), table_name="location_aliases")
    op.drop_table("location_aliases")

    op.drop_index("ix_delivered_trips_vendor_id", table_name="delivered_trips")
    op.drop_index(
        op.f("ix_delivered_trips_pickup_location_id"), table_name="delivered_trips"
    )
    op.drop_index(op.f("ix_delivered_trips_id"), table_name="delivered_trips")
    op.drop_index(
        op.f("ix_delivered_trips_dropoff_location_id"), table_name="delivered_trips"
    )
    op.drop_index(op.f("ix_delivered_trips_driver_id"), table_name="delivered_trips")
    op.drop_index("ix_delivered_trips_created_at", table_name="delivered_trips")
    op.drop_index(op.f("ix_delivered_trips_cont_number"), table_name="delivered_trips")
    op.drop_index(op.f("ix_delivered_trips_client_id"), table_name="delivered_trips")
    op.drop_index(
        op.f("ix_delivered_trips_booked_trip_id"), table_name="delivered_trips"
    )
    op.drop_table("delivered_trips")

    op.drop_index("ix_booked_trips_trip_date", table_name="booked_trips")
    op.drop_index(op.f("ix_booked_trips_pickup_location_id"), table_name="booked_trips")
    op.drop_index(op.f("ix_booked_trips_id"), table_name="booked_trips")
    op.drop_index(
        op.f("ix_booked_trips_dropoff_location_id"), table_name="booked_trips"
    )
    op.drop_index(op.f("ix_booked_trips_cont_number"), table_name="booked_trips")
    op.drop_index("ix_booked_trips_client_id_trip_date", table_name="booked_trips")
    op.drop_index(op.f("ix_booked_trips_client_id"), table_name="booked_trips")
    op.drop_table("booked_trips")

    op.drop_index(op.f("ix_vehicles_vendor_id"), table_name="vehicles")
    op.drop_index(op.f("ix_vehicles_plate"), table_name="vehicles")
    op.drop_index(op.f("ix_vehicles_id"), table_name="vehicles")
    op.drop_index(op.f("ix_vehicles_driver_id"), table_name="vehicles")
    op.drop_table("vehicles")

    op.drop_index(
        op.f("ix_push_subscriptions_user_id"), table_name="push_subscriptions"
    )
    op.drop_index(op.f("ix_push_subscriptions_id"), table_name="push_subscriptions")
    op.drop_table("push_subscriptions")

    op.drop_index(op.f("ix_locations_name"), table_name="locations")
    op.drop_index("ix_locations_lat_lng", table_name="locations")
    op.drop_index(op.f("ix_locations_id"), table_name="locations")
    op.drop_table("locations")

    op.drop_index(
        op.f("ix_driver_salary_configs_id"), table_name="driver_salary_configs"
    )
    op.drop_index(
        op.f("ix_driver_salary_configs_driver_id"), table_name="driver_salary_configs"
    )
    op.drop_index(
        "ix_driver_salary_configs_driver_effective_desc",
        table_name="driver_salary_configs",
    )
    op.drop_table("driver_salary_configs")

    op.drop_index(op.f("ix_audit_logs_user_id"), table_name="audit_logs")
    op.drop_index(op.f("ix_audit_logs_table_name"), table_name="audit_logs")
    op.drop_index(op.f("ix_audit_logs_id"), table_name="audit_logs")
    op.drop_index(op.f("ix_audit_logs_created_at"), table_name="audit_logs")
    op.drop_index(op.f("ix_audit_logs_action"), table_name="audit_logs")
    op.drop_table("audit_logs")

    op.drop_index(op.f("ix_vendors_name"), table_name="vendors")
    op.drop_index(op.f("ix_vendors_id"), table_name="vendors")
    op.drop_index(op.f("ix_vendors_code"), table_name="vendors")
    op.drop_table("vendors")

    op.drop_index(op.f("ix_users_username"), table_name="users")
    op.drop_index(op.f("ix_users_phone"), table_name="users")
    op.drop_index(op.f("ix_users_id"), table_name="users")
    op.drop_index(op.f("ix_users_email"), table_name="users")
    op.drop_index(op.f("ix_users_cccd"), table_name="users")
    op.drop_table("users")

    op.drop_table("settings")

    op.drop_index(op.f("ix_clients_name"), table_name="clients")
    op.drop_index(op.f("ix_clients_id"), table_name="clients")
    op.drop_index(op.f("ix_clients_code"), table_name="clients")
    op.drop_table("clients")
