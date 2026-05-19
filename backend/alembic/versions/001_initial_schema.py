"""001 initial schema

Revision ID: 001
Revises: None
Create Date: 2026-05-17

Fresh consolidated schema with renamed tables:
  trip_orders → booked_trips, work_orders → delivered_trips,
  trip_order_work_orders → matched_trips.
Removed: trip_container_photos.
Container tables trimmed. All tables have created_at/updated_at.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "001"
down_revision = None
branch_labels = None
depends_on = None

JSON_TYPE = sa.JSON().with_variant(postgresql.JSONB(), "postgresql")


def upgrade() -> None:
    # ── Independent tables ──────────────────────────────────────────────

    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("phone", sa.String(20), nullable=True),
        sa.Column("email", sa.String(255), nullable=True),
        sa.Column("username", sa.String(100), nullable=False),
        sa.Column("full_name", sa.String(200), nullable=True),
        sa.Column("cccd", sa.String(12), nullable=True),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("role", sa.String(20), nullable=False),
        sa.Column("vendor", sa.String(255), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("tractor_plate", sa.String(20), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_users_id", "users", ["id"])
    op.create_index("ix_users_phone", "users", ["phone"], unique=True)
    op.create_index("ix_users_email", "users", ["email"], unique=True)
    op.create_index("ix_users_cccd", "users", ["cccd"], unique=True)
    op.create_index("ix_users_username", "users", ["username"])
    op.create_index("ix_users_vendor", "users", ["vendor"])

    op.create_table(
        "clients",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("code", sa.String(50), nullable=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("type", sa.String(20), nullable=False),
        sa.Column("phone", sa.String(50), nullable=False),
        sa.Column("tax_code", sa.String(50), nullable=True),
        sa.Column("address", sa.String(500), nullable=True),
        sa.Column("contact_person", sa.String(255), nullable=True),
        sa.Column("outstanding_debt", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_clients_id", "clients", ["id"])
    op.create_index("ix_clients_code", "clients", ["code"], unique=True)
    op.create_index("ix_clients_name", "clients", ["name"])

    op.create_table(
        "vendors",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("type", sa.String(20), nullable=True),
        sa.Column("phone", sa.String(50), nullable=True),
        sa.Column("tax_code", sa.String(50), nullable=True),
        sa.Column("address", sa.String(500), nullable=True),
        sa.Column("contact_person", sa.String(255), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_vendors_id", "vendors", ["id"])
    op.create_index("ix_vendors_name", "vendors", ["name"], unique=True)

    op.create_table(
        "settings",
        sa.Column("key", sa.String(100), primary_key=True),
        sa.Column("value", sa.String(500), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )

    op.create_table(
        "salary_period_configs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("from_day", sa.Integer(), nullable=False),
        sa.Column("to_day", sa.Integer(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_salary_period_configs_id", "salary_period_configs", ["id"])

    # ── Tables with FK to users/clients/vendors ─────────────────────────

    op.create_table(
        "audit_logs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("action", sa.String(20), nullable=False),
        sa.Column("table_name", sa.String(100), nullable=False),
        sa.Column("record_id", sa.Integer(), nullable=False),
        sa.Column("old_value", sa.Text(), nullable=True),
        sa.Column("new_value", sa.Text(), nullable=True),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_audit_logs_id", "audit_logs", ["id"])
    op.create_index("ix_audit_logs_action", "audit_logs", ["action"])
    op.create_index("ix_audit_logs_table_name", "audit_logs", ["table_name"])
    op.create_index("ix_audit_logs_user_id", "audit_logs", ["user_id"])
    op.create_index("ix_audit_logs_created_at", "audit_logs", ["created_at"])

    op.create_table(
        "locations",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("lat", sa.Float(), nullable=True),
        sa.Column("lng", sa.Float(), nullable=True),
        sa.Column("geocoded_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("geocode_source", sa.String(20), nullable=True),
        sa.Column("pending_geocode", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_via", sa.String(30), nullable=True),
        sa.Column("created_by_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("location_review_needed", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_locations_id", "locations", ["id"])
    op.create_index("ix_locations_name", "locations", ["name"], unique=True)
    op.create_index("ix_locations_lat_lng", "locations", ["lat", "lng"])

    op.create_table(
        "location_aliases",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("location_id", sa.Integer(), sa.ForeignKey("locations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("alias", sa.String(255), nullable=False),
        sa.Column("alias_normalized", sa.String(255), nullable=False),
        sa.Column("source", sa.String(30), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("created_by_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.UniqueConstraint("alias_normalized"),
    )
    op.create_index("ix_location_aliases_id", "location_aliases", ["id"])
    op.create_index("ix_location_aliases_location_id", "location_aliases", ["location_id"])
    op.create_index("ix_location_aliases_source", "location_aliases", ["source"])

    op.create_table(
        "vehicles",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("plate", sa.String(20), nullable=False),
        sa.Column("driver_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_vehicles_id", "vehicles", ["id"])
    op.create_index("ix_vehicles_plate", "vehicles", ["plate"], unique=True)
    op.create_index("ix_vehicles_driver_id", "vehicles", ["driver_id"])

    op.create_table(
        "vehicle_drivers",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("vehicle_id", sa.Integer(), sa.ForeignKey("vehicles.id", ondelete="CASCADE"), nullable=False),
        sa.Column("driver_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("effective_from", sa.Date(), nullable=False),
        sa.Column("effective_to", sa.Date(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_vehicle_drivers_id", "vehicle_drivers", ["id"])
    op.create_index("ix_vehicle_drivers_vehicle_id", "vehicle_drivers", ["vehicle_id"])
    op.create_index("ix_vehicle_drivers_driver_id", "vehicle_drivers", ["driver_id"])

    op.create_table(
        "vehicle_expenses",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("vehicle_id", sa.Integer(), sa.ForeignKey("vehicles.id", ondelete="SET NULL"), nullable=True),
        sa.Column("category", sa.String(20), nullable=False),
        sa.Column("amount", sa.Integer(), nullable=False),
        sa.Column("expense_date", sa.Date(), nullable=False),
        sa.Column("description", sa.String(500), nullable=True),
        sa.Column("receipt_url", sa.String(1000), nullable=True),
        sa.Column("created_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_vehicle_expenses_id", "vehicle_expenses", ["id"])
    op.create_index("ix_vehicle_expenses_vehicle_date", "vehicle_expenses", ["vehicle_id", "expense_date"])
    op.create_index("ix_vehicle_expenses_category_date", "vehicle_expenses", ["category", "expense_date"])

    op.create_table(
        "pricings",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("client_id", sa.Integer(), sa.ForeignKey("clients.id"), nullable=False),
        sa.Column("work_type", sa.String(10), nullable=False),
        sa.Column("pickup_location_id", sa.Integer(), sa.ForeignKey("locations.id"), nullable=False),
        sa.Column("dropoff_location_id", sa.Integer(), sa.ForeignKey("locations.id"), nullable=False),
        sa.Column("operation_type", sa.String(20), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.UniqueConstraint("client_id", "operation_type", "work_type", "pickup_location_id", "dropoff_location_id", name="uq_pricings_lane"),
    )
    op.create_index("ix_pricings_id", "pricings", ["id"])
    op.create_index("ix_pricings_client_id", "pricings", ["client_id"])
    op.create_index("ix_pricings_pickup_location_id", "pricings", ["pickup_location_id"])
    op.create_index("ix_pricings_dropoff_location_id", "pricings", ["dropoff_location_id"])

    op.create_table(
        "pricing_lines",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("pricing_id", sa.Integer(), sa.ForeignKey("pricings.id", ondelete="CASCADE"), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("unit_price", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("driver_salary", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("allowance", sa.Integer(), nullable=False, server_default="0"),
    )
    op.create_index("ix_pricing_lines_id", "pricing_lines", ["id"])
    op.create_index("ix_pricing_lines_pricing_id", "pricing_lines", ["pricing_id"])

    op.create_table(
        "routes",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("route", sa.String(500), nullable=False),
        sa.Column("pickup_location_id", sa.Integer(), sa.ForeignKey("locations.id"), nullable=False),
        sa.Column("dropoff_location_id", sa.Integer(), sa.ForeignKey("locations.id"), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.UniqueConstraint("pickup_location_id", "dropoff_location_id", name="uq_routes_lane"),
    )
    op.create_index("ix_routes_id", "routes", ["id"])
    op.create_index("ix_routes_pickup_location_id", "routes", ["pickup_location_id"])
    op.create_index("ix_routes_dropoff_location_id", "routes", ["dropoff_location_id"])

    op.create_table(
        "salary_periods",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("driver_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=False),
        sa.Column("work_order_count", sa.Integer(), nullable=False),
        sa.Column("price_per_order", sa.Integer(), nullable=False),
        sa.Column("total_salary", sa.Integer(), nullable=False),
        sa.Column("total_allowance", sa.Integer(), nullable=False),
        sa.Column("total_deduction", sa.Integer(), nullable=False),
        sa.Column("net_pay", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_salary_periods_id", "salary_periods", ["id"])
    op.create_index("ix_salary_periods_driver_id", "salary_periods", ["driver_id"])

    op.create_table(
        "driver_salary_configs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("driver_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("base_salary", sa.Integer(), nullable=False),
        sa.Column("effective_from", sa.Date(), nullable=False),
        sa.Column("note", sa.String(500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("created_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.UniqueConstraint("driver_id", "effective_from", name="uq_driver_salary_configs_driver_effective"),
    )
    op.create_index("ix_driver_salary_configs_id", "driver_salary_configs", ["id"])
    op.create_index("ix_driver_salary_configs_driver_id", "driver_salary_configs", ["driver_id"])

    op.create_table(
        "customer_import_templates",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("client_id", sa.Integer(), sa.ForeignKey("clients.id", ondelete="CASCADE"), nullable=True),
        sa.Column("template_name", sa.String(255), nullable=False),
        sa.Column("structure_hash", sa.String(64), nullable=False),
        sa.Column("sheet_name", sa.String(255), nullable=False),
        sa.Column("header_row_index", sa.Integer(), nullable=False),
        sa.Column("column_mapping", JSON_TYPE, nullable=False),
        sa.Column("llm_cache", JSON_TYPE, nullable=True),
        sa.Column("last_used_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_used_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_by_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.UniqueConstraint("client_id", "structure_hash", name="uq_import_templates_client_structure"),
    )
    op.create_index("ix_customer_import_templates_id", "customer_import_templates", ["id"])
    op.create_index("ix_customer_import_templates_client_id", "customer_import_templates", ["client_id"])
    op.create_index("ix_customer_import_templates_structure_hash", "customer_import_templates", ["structure_hash"])

    # ── Renamed tables: booked_trips, delivered_trips ───────────────────

    op.create_table(
        "booked_trips",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("trip_date", sa.Date(), nullable=False),
        sa.Column("client_id", sa.Integer(), sa.ForeignKey("clients.id"), nullable=False),
        sa.Column("pickup_location_id", sa.Integer(), sa.ForeignKey("locations.id"), nullable=False),
        sa.Column("dropoff_location_id", sa.Integer(), sa.ForeignKey("locations.id"), nullable=False),
        sa.Column("operation_type", sa.String(20), nullable=True),
        sa.Column("work_type", sa.String(10), nullable=False),
        sa.Column("revenue", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("status", sa.String(20), nullable=False, server_default="PENDING"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_booked_trips_id", "booked_trips", ["id"])
    op.create_index("ix_booked_trips_client_id", "booked_trips", ["client_id"])
    op.create_index("ix_booked_trips_status", "booked_trips", ["status"])
    op.create_index("ix_booked_trips_trip_date", "booked_trips", ["trip_date"])
    op.create_index("ix_booked_trips_client_id_trip_date", "booked_trips", ["client_id", "trip_date"])

    op.create_table(
        "booked_trip_containers",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("booked_trip_id", sa.Integer(), sa.ForeignKey("booked_trips.id", ondelete="CASCADE"), nullable=False),
        sa.Column("container_number", sa.String(50), nullable=False),
        sa.Column("cont_type", sa.String(10), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_booked_trip_containers_id", "booked_trip_containers", ["id"])
    op.create_index("ix_booked_trip_containers_booked_trip_id", "booked_trip_containers", ["booked_trip_id"])
    op.create_index("ix_booked_trip_containers_container_number", "booked_trip_containers", ["container_number"])

    op.create_table(
        "delivered_trips",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("client_id", sa.Integer(), sa.ForeignKey("clients.id"), nullable=False),
        sa.Column("pickup_location_id", sa.Integer(), sa.ForeignKey("locations.id"), nullable=False),
        sa.Column("dropoff_location_id", sa.Integer(), sa.ForeignKey("locations.id"), nullable=False),
        sa.Column("driver_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("vehicle_id", sa.Integer(), sa.ForeignKey("vehicles.id"), nullable=True),
        sa.Column("vendor_id", sa.Integer(), sa.ForeignKey("vendors.id"), nullable=True),
        sa.Column("vessel", sa.String(100), nullable=True),
        sa.Column("operation_type", sa.String(20), nullable=True),
        sa.Column("work_type", sa.String(10), nullable=False),
        sa.Column("gps_lat", sa.Float(), nullable=True),
        sa.Column("gps_lng", sa.Float(), nullable=True),
        sa.Column("gps_address", sa.String(500), nullable=True),
        sa.Column("revenue", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("driver_salary", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("allowance", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("trip_date", sa.Date(), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="PENDING"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_delivered_trips_id", "delivered_trips", ["id"])
    op.create_index("ix_delivered_trips_client_id", "delivered_trips", ["client_id"])
    op.create_index("ix_delivered_trips_driver_id", "delivered_trips", ["driver_id"])
    op.create_index("ix_delivered_trips_status", "delivered_trips", ["status"])
    op.create_index("ix_delivered_trips_created_at", "delivered_trips", ["created_at"])
    op.create_index("ix_delivered_trips_driver_id_status", "delivered_trips", ["driver_id", "status"])

    op.create_table(
        "delivered_trip_containers",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("delivered_trip_id", sa.Integer(), sa.ForeignKey("delivered_trips.id", ondelete="CASCADE"), nullable=False),
        sa.Column("container_number", sa.String(50), nullable=False),
        sa.Column("cont_type", sa.String(10), nullable=False),
        sa.Column("photo_url", sa.String(1000), nullable=True),
        sa.Column("photo_lat", sa.Float(), nullable=True),
        sa.Column("photo_lng", sa.Float(), nullable=True),
        sa.Column("photo_timestamp", sa.DateTime(timezone=True), nullable=True),
        sa.Column("photo_address", sa.String(500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_delivered_trip_containers_id", "delivered_trip_containers", ["id"])
    op.create_index("ix_delivered_trip_containers_delivered_trip_id", "delivered_trip_containers", ["delivered_trip_id"])
    op.create_index("ix_delivered_trip_containers_container_number", "delivered_trip_containers", ["container_number"])

    op.create_table(
        "matched_trips",
        sa.Column("booked_trip_id", sa.Integer(), sa.ForeignKey("booked_trips.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("delivered_trip_id", sa.Integer(), sa.ForeignKey("delivered_trips.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )

    # ── Reconciliation tables (updated FKs) ────────────────────────────

    op.create_table(
        "reconciliations",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("booked_trip_id", sa.Integer(), sa.ForeignKey("booked_trips.id", ondelete="CASCADE"), nullable=False),
        sa.Column("delivered_trip_id", sa.Integer(), sa.ForeignKey("delivered_trips.id", ondelete="CASCADE"), nullable=False),
        sa.Column("match_score", sa.Float(), nullable=False, server_default="0"),
        sa.Column("matched_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("matched_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("unmatched_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("unmatched_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("reason", sa.String(500), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.UniqueConstraint("booked_trip_id", "delivered_trip_id", "is_active", name="uq_reconciliations_active"),
    )
    op.create_index("ix_reconciliations_id", "reconciliations", ["id"])
    op.create_index("ix_reconciliations_booked_trip_id", "reconciliations", ["booked_trip_id"])
    op.create_index("ix_reconciliations_delivered_trip_id", "reconciliations", ["delivered_trip_id"])

    op.create_table(
        "customer_reconciliation_imports",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("client_id", sa.Integer(), sa.ForeignKey("clients.id"), nullable=False),
        sa.Column("period_start", sa.Date(), nullable=False),
        sa.Column("period_end", sa.Date(), nullable=False),
        sa.Column("source_filename", sa.String(500), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="PARSED"),
        sa.Column("summary", JSON_TYPE, nullable=True),
        sa.Column("uploaded_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("uploaded_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("applied_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("applied_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_customer_recon_imports_client_uploaded", "customer_reconciliation_imports", ["client_id", "uploaded_at"])

    op.create_table(
        "customer_reconciliation_rows",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("import_id", sa.Integer(), sa.ForeignKey("customer_reconciliation_imports.id", ondelete="CASCADE"), nullable=False),
        sa.Column("container_number", sa.String(50), nullable=True),
        sa.Column("trip_date", sa.Date(), nullable=True),
        sa.Column("customer_status", sa.String(20), nullable=False),
        sa.Column("customer_note", sa.String(500), nullable=True),
        sa.Column("resolved_booked_trip_id", sa.Integer(), sa.ForeignKey("booked_trips.id"), nullable=True),
        sa.Column("apply_status", sa.String(20), nullable=False, server_default="PENDING"),
        sa.Column("apply_message", sa.String(500), nullable=True),
        sa.Column("diff_classification", sa.String(30), nullable=True),
        sa.Column("customer_amount", sa.Integer(), nullable=True),
        sa.Column("our_amount", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_customer_reconciliation_rows_id", "customer_reconciliation_rows", ["id"])
    op.create_index("ix_customer_reconciliation_rows_import_id", "customer_reconciliation_rows", ["import_id"])
    op.create_index("ix_customer_reconciliation_rows_resolved_booked_trip_id", "customer_reconciliation_rows", ["resolved_booked_trip_id"])

    op.create_table(
        "vendor_reconciliation_imports",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("vendor_id", sa.Integer(), sa.ForeignKey("vendors.id"), nullable=False),
        sa.Column("period_from", sa.Date(), nullable=False),
        sa.Column("period_to", sa.Date(), nullable=False),
        sa.Column("source_filename", sa.String(500), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="PENDING_REVIEW"),
        sa.Column("totals", JSON_TYPE, nullable=True),
        sa.Column("notes", sa.String(1000), nullable=True),
        sa.Column("uploaded_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("uploaded_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("applied_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("applied_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_vendor_recon_imports_vendor_uploaded", "vendor_reconciliation_imports", ["vendor_id", "uploaded_at"])
    op.create_index("ix_vendor_recon_imports_status", "vendor_reconciliation_imports", ["status"])

    op.create_table(
        "vendor_reconciliation_rows",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("import_id", sa.Integer(), sa.ForeignKey("vendor_reconciliation_imports.id", ondelete="CASCADE"), nullable=False),
        sa.Column("container_number", sa.String(50), nullable=True),
        sa.Column("work_type", sa.String(10), nullable=True),
        sa.Column("route_text", sa.String(500), nullable=True),
        sa.Column("trip_date", sa.Date(), nullable=True),
        sa.Column("vendor_amount", sa.Integer(), nullable=True),
        sa.Column("match_status", sa.String(20), nullable=False, server_default="VENDOR_ONLY"),
        sa.Column("matched_delivered_trip_id", sa.Integer(), sa.ForeignKey("delivered_trips.id"), nullable=True),
        sa.Column("reviewer_note", sa.String(500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_vendor_reconciliation_rows_id", "vendor_reconciliation_rows", ["id"])
    op.create_index("ix_vendor_reconciliation_rows_import_id", "vendor_reconciliation_rows", ["import_id"])
    op.create_index("ix_vendor_reconciliation_rows_matched_delivered_trip_id", "vendor_reconciliation_rows", ["matched_delivered_trip_id"])

    # ── updated_at triggers ─────────────────────────────────────────────
    op.execute("""
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = now();
            RETURN NEW;
        END;
        $$ language 'plpgsql';
    """)
    for tbl in [
        "users", "clients", "vendors", "locations", "vehicles",
        "vehicle_drivers", "vehicle_expenses", "pricings", "routes",
        "salary_periods", "driver_salary_configs", "customer_import_templates",
        "booked_trips", "booked_trip_containers", "delivered_trips",
        "delivered_trip_containers", "matched_trips", "reconciliations",
        "customer_reconciliation_imports", "customer_reconciliation_rows",
        "vendor_reconciliation_imports", "vendor_reconciliation_rows",
    ]:
        op.execute(f"""
            CREATE TRIGGER set_updated_at
                BEFORE UPDATE ON {tbl}
                FOR EACH ROW
                EXECUTE FUNCTION update_updated_at_column();
        """)


def downgrade() -> None:
    raise NotImplementedError("Forward-only migration — downgrade not supported.")
