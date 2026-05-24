"""create driver_salaries, drop allowance from delivered_trips & pricing_lines

Revision ID: 0003_driver_salaries
Revises: 0002_enable_unaccent
Create Date: 2026-05-24

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0003_driver_salaries"
down_revision: Union[str, None] = "0002_enable_unaccent"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create driver_salaries table
    op.create_table(
        "driver_salaries",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("driver_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("from_date", sa.Date(), nullable=False),
        sa.Column("to_date", sa.Date(), nullable=False),
        sa.Column("basic_salary", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("bonus_salary", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("allowance", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("note", sa.String(500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("created_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.UniqueConstraint("driver_id", "from_date", "to_date", name="uq_driver_salaries_period"),
    )
    op.create_index("ix_driver_salaries_driver_period", "driver_salaries", ["driver_id", "from_date", "to_date"])

    # 2. Bootstrap driver_salaries from existing data
    # Seed current period: basic_salary from config, bonus_salary from trips in period, allowance=0
    op.execute("""
        INSERT INTO driver_salaries (driver_id, from_date, to_date, basic_salary, bonus_salary, allowance, created_at, updated_at)
        SELECT
            u.id,
            make_date(
                EXTRACT(YEAR FROM CURRENT_DATE)::int,
                EXTRACT(MONTH FROM CURRENT_DATE)::int,
                COALESCE(s_from.value::int, 1)
            ) AS from_date,
            make_date(
                EXTRACT(YEAR FROM
                    CASE
                        WHEN COALESCE(s_to.value::int, 28) < COALESCE(s_from.value::int, 1)
                         AND EXTRACT(DAY FROM CURRENT_DATE)::int < COALESCE(s_from.value::int, 1)
                        THEN CURRENT_DATE
                        ELSE CURRENT_DATE + INTERVAL '1 month'
                    END
                )::int,
                EXTRACT(MONTH FROM
                    CASE
                        WHEN COALESCE(s_to.value::int, 28) < COALESCE(s_from.value::int, 1)
                         AND EXTRACT(DAY FROM CURRENT_DATE)::int < COALESCE(s_from.value::int, 1)
                        THEN CURRENT_DATE
                        ELSE CURRENT_DATE + INTERVAL '1 month'
                    END
                )::int,
                LEAST(COALESCE(s_to.value::int, 28), 28)
            ) AS to_date,
            COALESCE(dsc.base_salary, 0),
            COALESCE(dt_sum.bonus_salary, 0),
            0,
            NOW(),
            NOW()
        FROM users u
        LEFT JOIN settings s_from ON s_from.key = 'salary_from_day'
        LEFT JOIN settings s_to ON s_to.key = 'salary_to_day'
        LEFT JOIN LATERAL (
            SELECT base_salary
            FROM driver_salary_configs
            WHERE driver_id = u.id AND effective_from <= CURRENT_DATE
            ORDER BY effective_from DESC
            LIMIT 1
        ) dsc ON TRUE
        LEFT JOIN LATERAL (
            SELECT COALESCE(SUM(dt.driver_salary), 0) AS bonus_salary
            FROM delivered_trips dt
            WHERE dt.driver_id = u.id
              AND dt.booked_trip_id IS NOT NULL
              AND COALESCE(dt.trip_date, DATE(dt.created_at)) >= make_date(
                  EXTRACT(YEAR FROM CURRENT_DATE)::int,
                  EXTRACT(MONTH FROM CURRENT_DATE)::int,
                  COALESCE(s_from.value::int, 1)
              )
              AND COALESCE(dt.trip_date, DATE(dt.created_at)) <= make_date(
                  EXTRACT(YEAR FROM
                      CASE
                          WHEN COALESCE(s_to.value::int, 28) < COALESCE(s_from.value::int, 1)
                           AND EXTRACT(DAY FROM CURRENT_DATE)::int < COALESCE(s_from.value::int, 1)
                          THEN CURRENT_DATE
                          ELSE CURRENT_DATE + INTERVAL '1 month'
                      END
                  )::int,
                  EXTRACT(MONTH FROM
                      CASE
                          WHEN COALESCE(s_to.value::int, 28) < COALESCE(s_from.value::int, 1)
                           AND EXTRACT(DAY FROM CURRENT_DATE)::int < COALESCE(s_from.value::int, 1)
                          THEN CURRENT_DATE
                          ELSE CURRENT_DATE + INTERVAL '1 month'
                      END
                  )::int,
                  LEAST(COALESCE(s_to.value::int, 28), 28)
              )
        ) dt_sum ON TRUE
        WHERE u.role = 'driver' AND u.is_active = true
    """)

    # 3. Drop allowance from delivered_trips
    op.drop_column("delivered_trips", "allowance")

    # 4. Drop allowance from pricing_lines
    op.drop_column("pricing_lines", "allowance")


def downgrade() -> None:
    # Re-add allowance to pricing_lines
    op.add_column("pricing_lines", sa.Column("allowance", sa.Integer(), nullable=False, server_default="0"))

    # Re-add allowance to delivered_trips
    op.add_column("delivered_trips", sa.Column("allowance", sa.Integer(), nullable=False, server_default="0"))

    # Drop driver_salaries
    op.drop_index("ix_driver_salaries_driver_period", table_name="driver_salaries")
    op.drop_table("driver_salaries")
