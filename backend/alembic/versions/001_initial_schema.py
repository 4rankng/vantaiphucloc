"""Initial schema — single-tenant for Phúc Lộc.

Revision ID: 001
Revises: None
"""
from alembic import op
import sqlalchemy as sa

revision = "001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── users ─────────────────────────────────────────────────────────────
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("phone", sa.String(20), unique=True, nullable=False),
        sa.Column("email", sa.String(255), unique=True, nullable=True),
        sa.Column("username", sa.String(100), nullable=False),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("role", sa.String(20), nullable=False, server_default="driver"),
        sa.Column("vendor", sa.String(255), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("tractor_plate", sa.String(20), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_users_phone", "users", ["phone"])
    op.create_index("ix_users_email", "users", ["email"])
    op.create_index("ix_users_username", "users", ["username"])
    op.create_index("ix_users_vendor", "users", ["vendor"])

    # ── clients ───────────────────────────────────────────────────────────
    op.create_table(
        "clients",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("type", sa.String(20), nullable=False),
        sa.Column("phone", sa.String(50), nullable=False),
        sa.Column("tax_code", sa.String(50), nullable=True),
        sa.Column("address", sa.String(500), nullable=True),
        sa.Column("contact_person", sa.String(255), nullable=True),
        sa.Column("outstanding_debt", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_clients_name", "clients", ["name"])

    # ── routes ────────────────────────────────────────────────────────────
    op.create_table(
        "routes",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("route", sa.String(500), nullable=False),
        sa.Column("type_20ft", sa.Integer(), nullable=False),
        sa.Column("type_40ft", sa.Integer(), nullable=False),
        sa.Column("is_two_way", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    # ── pricings ──────────────────────────────────────────────────────────
    op.create_table(
        "pricings",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("client_id", sa.Integer(), sa.ForeignKey("clients.id"), nullable=False),
        sa.Column("client_name", sa.String(255), nullable=False),
        sa.Column("work_type", sa.String(10), nullable=False),
        sa.Column("route", sa.String(500), nullable=False),
        sa.Column("unit_price", sa.Integer(), nullable=False),
        sa.Column("driver_salary", sa.Integer(), nullable=False),
        sa.Column("allowance", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_pricings_client_id", "pricings", ["client_id"])

    # ── pricing_lines ─────────────────────────────────────────────────────
    op.create_table(
        "pricing_lines",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("pricing_id", sa.Integer(), sa.ForeignKey("pricings.id", ondelete="CASCADE"), nullable=False),
        sa.Column("work_type", sa.String(10), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
    )
    op.create_index("ix_pricing_lines_pricing_id", "pricing_lines", ["pricing_id"])

    # ── work_orders ───────────────────────────────────────────────────────
    op.create_table(
        "work_orders",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("client_id", sa.Integer(), sa.ForeignKey("clients.id"), nullable=False),
        sa.Column("client_name", sa.String(255), nullable=False),
        sa.Column("route", sa.String(500), nullable=False),
        sa.Column("driver_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("driver_name", sa.String(255), nullable=False),
        sa.Column("tractor_plate", sa.String(20), nullable=False),
        sa.Column("gps_lat", sa.Float(), nullable=True),
        sa.Column("gps_lng", sa.Float(), nullable=True),
        sa.Column("gps_address", sa.String(500), nullable=True),
        sa.Column("unit_price", sa.Integer(), nullable=False),
        sa.Column("driver_salary", sa.Integer(), nullable=False),
        sa.Column("allowance", sa.Integer(), nullable=False),
        sa.Column("earning", sa.Integer(), nullable=False),
        sa.Column("pricing_id", sa.Integer(), sa.ForeignKey("pricings.id"), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="PENDING"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_work_orders_client_id", "work_orders", ["client_id"])
    op.create_index("ix_work_orders_driver_id", "work_orders", ["driver_id"])
    op.create_index("ix_work_orders_driver_id_status", "work_orders", ["driver_id", "status"])

    # ── work_order_containers ─────────────────────────────────────────────
    op.create_table(
        "work_order_containers",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("work_order_id", sa.Integer(), sa.ForeignKey("work_orders.id", ondelete="CASCADE"), nullable=False),
        sa.Column("container_number", sa.String(50), nullable=False),
        sa.Column("work_type", sa.String(10), nullable=False),
        sa.Column("photo_url", sa.String(1000), nullable=True),
        sa.Column("photo_lat", sa.Float(), nullable=True),
        sa.Column("photo_lng", sa.Float(), nullable=True),
        sa.Column("photo_timestamp", sa.DateTime(timezone=True), nullable=True),
        sa.Column("photo_address", sa.String(500), nullable=True),
    )
    op.create_index("ix_woc_work_order_id", "work_order_containers", ["work_order_id"])

    # ── trip_orders ───────────────────────────────────────────────────────
    op.create_table(
        "trip_orders",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("trip_date", sa.Date(), nullable=False),
        sa.Column("client_id", sa.Integer(), sa.ForeignKey("clients.id"), nullable=False),
        sa.Column("client_name", sa.String(255), nullable=False),
        sa.Column("work_type", sa.String(10), nullable=False),
        sa.Column("route", sa.String(500), nullable=False),
        sa.Column("tractor_plate", sa.String(20), nullable=False),
        sa.Column("driver_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("driver_name", sa.String(255), nullable=False),
        sa.Column("container_number", sa.String(50), nullable=False),
        sa.Column("pricing_id", sa.Integer(), sa.ForeignKey("pricings.id"), nullable=True),
        sa.Column("unit_price", sa.Integer(), nullable=False),
        sa.Column("driver_salary", sa.Integer(), nullable=False),
        sa.Column("allowance", sa.Integer(), nullable=False),
        sa.Column("revenue", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="DRAFT"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_trip_orders_client_id", "trip_orders", ["client_id"])
    op.create_index("ix_trip_orders_driver_id", "trip_orders", ["driver_id"])
    op.create_index("ix_trip_orders_driver_id_trip_date", "trip_orders", ["driver_id", "trip_date"])

    # ── trip_order_work_orders (join table) ───────────────────────────────
    op.create_table(
        "trip_order_work_orders",
        sa.Column("trip_order_id", sa.Integer(), sa.ForeignKey("trip_orders.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("work_order_id", sa.Integer(), sa.ForeignKey("work_orders.id"), primary_key=True),
    )

    # ── salary_periods ────────────────────────────────────────────────────
    op.create_table(
        "salary_periods",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("driver_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("driver_name", sa.String(255), nullable=False),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=False),
        sa.Column("work_order_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("price_per_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("total_salary", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("total_allowance", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("total_deduction", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("net_pay", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("status", sa.String(20), nullable=False, server_default="OPEN"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_salary_periods_driver_id", "salary_periods", ["driver_id"])

    # ── salary_period_configs (singleton) ─────────────────────────────────
    op.create_table(
        "salary_period_configs",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("from_day", sa.Integer(), nullable=False),
        sa.Column("to_day", sa.Integer(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    # ── push_subscriptions ────────────────────────────────────────────────
    op.create_table(
        "push_subscriptions",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("endpoint", sa.String(500), nullable=False),
        sa.Column("p256dh", sa.String(200), nullable=False),
        sa.Column("auth", sa.String(100), nullable=False),
        sa.Column("user_agent", sa.String(500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_push_subscriptions_user_id", "push_subscriptions", ["user_id"])


def downgrade() -> None:
    for table in [
        "push_subscriptions",
        "salary_period_configs",
        "salary_periods",
        "trip_order_work_orders",
        "trip_orders",
        "work_order_containers",
        "work_orders",
        "pricing_lines",
        "pricings",
        "routes",
        "clients",
        "users",
    ]:
        op.drop_table(table)
