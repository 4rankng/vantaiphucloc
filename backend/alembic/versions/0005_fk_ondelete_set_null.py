"""add ondelete SET NULL to user FK columns that lacked it

Revision ID: 0005_fk_ondelete_set_null
Revises: 0004_unique_username
Create Date: 2026-05-30

Several nullable FK columns referencing users.id had no ON DELETE action,
causing PostgreSQL to default to RESTRICT.  Deleting a driver (user) would
fail with a foreign-key violation whenever rows existed in these tables.

All affected columns are nullable, so SET NULL is the safe default.
"""
from typing import Sequence, Union

from alembic import op


revision: str = "0005_fk_ondelete_set_null"
down_revision: Union[str, None] = "0004_unique_username"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # vehicles.driver_id
    op.drop_constraint("vehicles_driver_id_fkey", "vehicles", type_="foreignkey")
    op.create_foreign_key(
        "vehicles_driver_id_fkey", "vehicles", "users",
        ["driver_id"], ["id"], ondelete="SET NULL",
    )
    # vehicles.vendor_id (same pattern — was missing ondelete)
    op.drop_constraint("vehicles_vendor_id_fkey", "vehicles", type_="foreignkey")
    op.create_foreign_key(
        "vehicles_vendor_id_fkey", "vehicles", "vendors",
        ["vendor_id"], ["id"], ondelete="SET NULL",
    )
    # vehicle_expenses.created_by
    op.drop_constraint("vehicle_expenses_created_by_fkey", "vehicle_expenses", type_="foreignkey")
    op.create_foreign_key(
        "vehicle_expenses_created_by_fkey", "vehicle_expenses", "users",
        ["created_by"], ["id"], ondelete="SET NULL",
    )
    # locations.created_by_id
    op.drop_constraint("locations_created_by_id_fkey", "locations", type_="foreignkey")
    op.create_foreign_key(
        "locations_created_by_id_fkey", "locations", "users",
        ["created_by_id"], ["id"], ondelete="SET NULL",
    )
    # location_aliases.created_by_id
    op.drop_constraint("location_aliases_created_by_id_fkey", "location_aliases", type_="foreignkey")
    op.create_foreign_key(
        "location_aliases_created_by_id_fkey", "location_aliases", "users",
        ["created_by_id"], ["id"], ondelete="SET NULL",
    )
    # delivered_trips.driver_id
    op.drop_constraint("delivered_trips_driver_id_fkey", "delivered_trips", type_="foreignkey")
    op.create_foreign_key(
        "delivered_trips_driver_id_fkey", "delivered_trips", "users",
        ["driver_id"], ["id"], ondelete="SET NULL",
    )
    # delivered_trips.vendor_id (same pattern)
    op.drop_constraint("delivered_trips_vendor_id_fkey", "delivered_trips", type_="foreignkey")
    op.create_foreign_key(
        "delivered_trips_vendor_id_fkey", "delivered_trips", "vendors",
        ["vendor_id"], ["id"], ondelete="SET NULL",
    )
    # driver_salary_configs.created_by
    op.drop_constraint("driver_salary_configs_created_by_fkey", "driver_salary_configs", type_="foreignkey")
    op.create_foreign_key(
        "driver_salary_configs_created_by_fkey", "driver_salary_configs", "users",
        ["created_by"], ["id"], ondelete="SET NULL",
    )
    # driver_salaries.created_by
    op.drop_constraint("driver_salaries_created_by_fkey", "driver_salaries", type_="foreignkey")
    op.create_foreign_key(
        "driver_salaries_created_by_fkey", "driver_salaries", "users",
        ["created_by"], ["id"], ondelete="SET NULL",
    )
    # audit_logs.user_id
    op.drop_constraint("audit_logs_user_id_fkey", "audit_logs", type_="foreignkey")
    op.create_foreign_key(
        "audit_logs_user_id_fkey", "audit_logs", "users",
        ["user_id"], ["id"], ondelete="SET NULL",
    )
    # push_subscriptions.user_id
    op.drop_constraint("push_subscriptions_user_id_fkey", "push_subscriptions", type_="foreignkey")
    op.create_foreign_key(
        "push_subscriptions_user_id_fkey", "push_subscriptions", "users",
        ["user_id"], ["id"], ondelete="CASCADE",
    )


def downgrade() -> None:
    # Reverse each: drop the SET NULL/CASCADE variant, recreate without ondelete.
    for table, col, ref_table, ref_col, fkey_name in [
        ("vehicles", "driver_id", "users", "id", "vehicles_driver_id_fkey"),
        ("vehicles", "vendor_id", "vendors", "id", "vehicles_vendor_id_fkey"),
        ("vehicle_expenses", "created_by", "users", "id", "vehicle_expenses_created_by_fkey"),
        ("locations", "created_by_id", "users", "id", "locations_created_by_id_fkey"),
        ("location_aliases", "created_by_id", "users", "id", "location_aliases_created_by_id_fkey"),
        ("delivered_trips", "driver_id", "users", "id", "delivered_trips_driver_id_fkey"),
        ("delivered_trips", "vendor_id", "vendors", "id", "delivered_trips_vendor_id_fkey"),
        ("driver_salary_configs", "created_by", "users", "id", "driver_salary_configs_created_by_fkey"),
        ("driver_salaries", "created_by", "users", "id", "driver_salaries_created_by_fkey"),
        ("audit_logs", "user_id", "users", "id", "audit_logs_user_id_fkey"),
        ("push_subscriptions", "user_id", "users", "id", "push_subscriptions_user_id_fkey"),
    ]:
        op.drop_constraint(fkey_name, table, type_="foreignkey")
        op.create_foreign_key(fkey_name, table, ref_table, [col], [ref_col])
