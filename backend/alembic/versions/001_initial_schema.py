"""initial schema

Revision ID: 001
Revises:
Create Date: 2024-01-01 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. companies
    op.create_table(
        "companies",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_companies_id", "companies", ["id"], unique=False)

    # 2. users (FK → companies)
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("phone", sa.String(20), nullable=False),
        sa.Column("username", sa.String(100), nullable=False),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("role", sa.String(20), nullable=False),
        sa.Column("company_id", sa.Integer(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("tractor_plate", sa.String(20), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_users_id", "users", ["id"], unique=False)
    op.create_index("ix_users_phone", "users", ["phone"], unique=True)
    op.create_index("ix_users_company_id", "users", ["company_id"], unique=False)
    op.create_index("ix_users_company_id_role", "users", ["company_id", "role"], unique=False)

    # 3. clients (FK → companies)
    op.create_table(
        "clients",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("company_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("type", sa.String(20), nullable=False),
        sa.Column("phone", sa.String(50), nullable=False),
        sa.Column("tax_code", sa.String(50), nullable=True),
        sa.Column("address", sa.String(500), nullable=True),
        sa.Column("contact_person", sa.String(255), nullable=True),
        sa.Column("outstanding_debt", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_clients_id", "clients", ["id"], unique=False)
    op.create_index("ix_clients_company_id", "clients", ["company_id"], unique=False)
    op.create_index("ix_clients_name", "clients", ["name"], unique=False)

    # 4. routes (FK → companies)
    op.create_table(
        "routes",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("company_id", sa.Integer(), nullable=False),
        sa.Column("route", sa.String(500), nullable=False),
        sa.Column("type_20ft", sa.Integer(), nullable=False),
        sa.Column("type_40ft", sa.Integer(), nullable=False),
        sa.Column("is_two_way", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_routes_id", "routes", ["id"], unique=False)
    op.create_index("ix_routes_company_id", "routes", ["company_id"], unique=False)

    # 5. pricings (FK → companies, clients)
    op.create_table(
        "pricings",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("company_id", sa.Integer(), nullable=False),
        sa.Column("client_id", sa.Integer(), nullable=False),
        sa.Column("client_name", sa.String(255), nullable=False),
        sa.Column("work_type", sa.String(10), nullable=False),
        sa.Column("route", sa.String(500), nullable=False),
        sa.Column("unit_price", sa.Integer(), nullable=False),
        sa.Column("driver_salary", sa.Integer(), nullable=False),
        sa.Column("allowance", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"]),
        sa.ForeignKeyConstraint(["client_id"], ["clients.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_pricings_id", "pricings", ["id"], unique=False)
    op.create_index("ix_pricings_company_id", "pricings", ["company_id"], unique=False)
    op.create_index("ix_pricings_client_id", "pricings", ["client_id"], unique=False)

    # 6. pricing_lines (FK → pricings, CASCADE)
    op.create_table(
        "pricing_lines",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("pricing_id", sa.Integer(), nullable=False),
        sa.Column("work_type", sa.String(10), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["pricing_id"], ["pricings.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_pricing_lines_id", "pricing_lines", ["id"], unique=False)
    op.create_index("ix_pricing_lines_pricing_id", "pricing_lines", ["pricing_id"], unique=False)

    # 7. work_orders (FK → companies, clients, users, pricings)
    op.create_table(
        "work_orders",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("company_id", sa.Integer(), nullable=False),
        sa.Column("client_id", sa.Integer(), nullable=False),
        sa.Column("client_name", sa.String(255), nullable=False),
        sa.Column("route", sa.String(500), nullable=False),
        sa.Column("driver_id", sa.Integer(), nullable=False),
        sa.Column("driver_name", sa.String(255), nullable=False),
        sa.Column("tractor_plate", sa.String(20), nullable=False),
        sa.Column("gps_lat", sa.Float(), nullable=True),
        sa.Column("gps_lng", sa.Float(), nullable=True),
        sa.Column("gps_address", sa.String(500), nullable=True),
        sa.Column("unit_price", sa.Integer(), nullable=False),
        sa.Column("driver_salary", sa.Integer(), nullable=False),
        sa.Column("allowance", sa.Integer(), nullable=False),
        sa.Column("earning", sa.Integer(), nullable=False),
        sa.Column("pricing_id", sa.Integer(), nullable=True),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"]),
        sa.ForeignKeyConstraint(["client_id"], ["clients.id"]),
        sa.ForeignKeyConstraint(["driver_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["pricing_id"], ["pricings.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_work_orders_id", "work_orders", ["id"], unique=False)
    op.create_index("ix_work_orders_company_id", "work_orders", ["company_id"], unique=False)
    op.create_index("ix_work_orders_client_id", "work_orders", ["client_id"], unique=False)
    op.create_index("ix_work_orders_driver_id", "work_orders", ["driver_id"], unique=False)
    op.create_index("ix_work_orders_company_id_status", "work_orders", ["company_id", "status"], unique=False)
    op.create_index("ix_work_orders_driver_id_status", "work_orders", ["driver_id", "status"], unique=False)

    # 8. work_order_containers (FK → work_orders, CASCADE)
    op.create_table(
        "work_order_containers",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("work_order_id", sa.Integer(), nullable=False),
        sa.Column("container_number", sa.String(50), nullable=False),
        sa.Column("work_type", sa.String(10), nullable=False),
        sa.Column("photo_url", sa.String(1000), nullable=True),
        sa.ForeignKeyConstraint(["work_order_id"], ["work_orders.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_work_order_containers_id", "work_order_containers", ["id"], unique=False)
    op.create_index("ix_work_order_containers_work_order_id", "work_order_containers", ["work_order_id"], unique=False)

    # 9. trip_orders (FK → companies, clients, users, pricings)
    op.create_table(
        "trip_orders",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("company_id", sa.Integer(), nullable=False),
        sa.Column("trip_date", sa.Date(), nullable=False),
        sa.Column("client_id", sa.Integer(), nullable=False),
        sa.Column("client_name", sa.String(255), nullable=False),
        sa.Column("work_type", sa.String(10), nullable=False),
        sa.Column("route", sa.String(500), nullable=False),
        sa.Column("tractor_plate", sa.String(20), nullable=False),
        sa.Column("driver_id", sa.Integer(), nullable=False),
        sa.Column("driver_name", sa.String(255), nullable=False),
        sa.Column("container_number", sa.String(50), nullable=False),
        sa.Column("pricing_id", sa.Integer(), nullable=True),
        sa.Column("unit_price", sa.Integer(), nullable=False),
        sa.Column("driver_salary", sa.Integer(), nullable=False),
        sa.Column("allowance", sa.Integer(), nullable=False),
        sa.Column("revenue", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"]),
        sa.ForeignKeyConstraint(["client_id"], ["clients.id"]),
        sa.ForeignKeyConstraint(["driver_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["pricing_id"], ["pricings.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_trip_orders_id", "trip_orders", ["id"], unique=False)
    op.create_index("ix_trip_orders_company_id", "trip_orders", ["company_id"], unique=False)
    op.create_index("ix_trip_orders_client_id", "trip_orders", ["client_id"], unique=False)
    op.create_index("ix_trip_orders_driver_id", "trip_orders", ["driver_id"], unique=False)
    op.create_index("ix_trip_orders_company_id_status", "trip_orders", ["company_id", "status"], unique=False)
    op.create_index("ix_trip_orders_driver_id_trip_date", "trip_orders", ["driver_id", "trip_date"], unique=False)

    # 10. trip_order_work_orders (FK → trip_orders CASCADE, work_orders)
    op.create_table(
        "trip_order_work_orders",
        sa.Column("trip_order_id", sa.Integer(), nullable=False),
        sa.Column("work_order_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["trip_order_id"], ["trip_orders.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["work_order_id"], ["work_orders.id"]),
        sa.PrimaryKeyConstraint("trip_order_id", "work_order_id"),
    )

    # 11. salary_periods (FK → companies, users)
    op.create_table(
        "salary_periods",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("company_id", sa.Integer(), nullable=False),
        sa.Column("driver_id", sa.Integer(), nullable=False),
        sa.Column("driver_name", sa.String(255), nullable=False),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=False),
        sa.Column("work_order_count", sa.Integer(), nullable=False),
        sa.Column("price_per_order", sa.Integer(), nullable=False),
        sa.Column("total_salary", sa.Integer(), nullable=False),
        sa.Column("total_allowance", sa.Integer(), nullable=False),
        sa.Column("total_deduction", sa.Integer(), nullable=False),
        sa.Column("net_pay", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"]),
        sa.ForeignKeyConstraint(["driver_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_salary_periods_id", "salary_periods", ["id"], unique=False)
    op.create_index("ix_salary_periods_company_id", "salary_periods", ["company_id"], unique=False)
    op.create_index("ix_salary_periods_driver_id", "salary_periods", ["driver_id"], unique=False)

    # 12. salary_period_configs (FK → companies, UNIQUE on company_id)
    op.create_table(
        "salary_period_configs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("company_id", sa.Integer(), nullable=False),
        sa.Column("from_day", sa.Integer(), nullable=False),
        sa.Column("to_day", sa.Integer(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("company_id"),
    )
    op.create_index("ix_salary_period_configs_id", "salary_period_configs", ["id"], unique=False)
    op.create_index("ix_salary_period_configs_company_id", "salary_period_configs", ["company_id"], unique=False)


def downgrade() -> None:
    # Drop in reverse order to respect FK dependencies
    op.drop_table("salary_period_configs")
    op.drop_table("salary_periods")
    op.drop_table("trip_order_work_orders")
    op.drop_table("trip_orders")
    op.drop_table("work_order_containers")
    op.drop_table("work_orders")
    op.drop_table("pricing_lines")
    op.drop_table("pricings")
    op.drop_table("routes")
    op.drop_table("clients")
    op.drop_table("users")
    op.drop_table("companies")
