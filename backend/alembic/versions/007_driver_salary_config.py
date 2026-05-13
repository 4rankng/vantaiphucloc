"""Add driver_salary_configs table (base salary history per driver).

Revision ID: 007
Revises: 006
Create Date: 2026-05-13
"""

from alembic import op
import sqlalchemy as sa

revision = "007"
down_revision = "006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    from sqlalchemy import inspect

    conn = op.get_bind()
    insp = inspect(conn)
    existing_tables = insp.get_table_names()

    if "driver_salary_configs" not in existing_tables:
        op.create_table(
            "driver_salary_configs",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column(
                "driver_id",
                sa.Integer(),
                sa.ForeignKey("users.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column("base_salary", sa.Integer(), nullable=False),
            sa.Column("effective_from", sa.Date(), nullable=False),
            sa.Column("note", sa.String(length=500), nullable=True),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("CURRENT_TIMESTAMP"),
                nullable=False,
            ),
            sa.Column(
                "created_by",
                sa.Integer(),
                sa.ForeignKey("users.id"),
                nullable=True,
            ),
            sa.UniqueConstraint(
                "driver_id",
                "effective_from",
                name="uq_driver_salary_configs_driver_effective",
            ),
        )
        op.create_index(
            "ix_driver_salary_configs_driver_id",
            "driver_salary_configs",
            ["driver_id"],
        )
        op.create_index(
            "ix_driver_salary_configs_driver_effective_desc",
            "driver_salary_configs",
            ["driver_id", sa.text("effective_from DESC")],
        )


def downgrade() -> None:
    from sqlalchemy import inspect

    conn = op.get_bind()
    insp = inspect(conn)
    if "driver_salary_configs" in insp.get_table_names():
        op.drop_index(
            "ix_driver_salary_configs_driver_effective_desc",
            table_name="driver_salary_configs",
        )
        op.drop_index(
            "ix_driver_salary_configs_driver_id",
            table_name="driver_salary_configs",
        )
        op.drop_table("driver_salary_configs")
