"""Drop multi-tenancy — remove company_id from all tables, drop companies table.

Revision ID: 006
Revises: 005
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = "006"
down_revision = "005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Drop indexes that reference company_id
    op.drop_index("ix_users_company_id_role", table_name="users")
    op.drop_index("ix_work_orders_company_id_status", table_name="work_orders")
    op.drop_index("ix_trip_orders_company_id_status", table_name="trip_orders")

    # Remove company_id columns from domain tables
    for table in [
        "salary_period_configs",
        "salary_periods",
        "trip_orders",
        "work_orders",
        "pricings",
        "routes",
        "clients",
    ]:
        op.drop_constraint(f"{table}_company_id_fkey", table, type_="foreignkey")
        op.drop_column(table, "company_id")

    # Remove company_id from users
    op.drop_constraint("users_company_id_fkey", "users", type_="foreignkey")
    op.drop_column("users", "company_id")

    # Drop companies table
    op.drop_table("companies")


def downgrade() -> None:
    # Re-create companies table
    op.create_table(
        "companies",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )

    # Re-add company_id to users
    op.add_column("users", sa.Column("company_id", sa.Integer(), nullable=True))
    op.create_foreign_key("users_company_id_fkey", "users", "companies", ["company_id"], ["id"])
    op.create_index("ix_users_company_id_role", "users", ["company_id", "role"])

    # Re-add company_id to domain tables
    for table in [
        "clients",
        "routes",
        "pricings",
        "work_orders",
        "trip_orders",
        "salary_periods",
        "salary_period_configs",
    ]:
        op.add_column(table, sa.Column("company_id", sa.Integer(), nullable=False, server_default="1"))
        op.create_foreign_key(f"{table}_company_id_fkey", table, "companies", ["company_id"], ["id"])

    # Re-create compound indexes
    op.create_index("ix_work_orders_company_id_status", "work_orders", ["company_id", "status"])
    op.create_index("ix_trip_orders_company_id_status", "trip_orders", ["company_id", "status"])
