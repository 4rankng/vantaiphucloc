"""Drop unit_price/driver_salary/allowance from pricings; drop work_type from pricing_lines

Revision ID: 018
Revises: 017
"""
from alembic import op
import sqlalchemy as sa

revision = "018"
down_revision = "017"
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()

    # Backfill any pricing_lines rows that are missing financials from their parent
    # (handles the orphaned records created without lines)
    conn.execute(sa.text("""
        INSERT INTO pricing_lines (pricing_id, quantity, unit_price, driver_salary, allowance)
        SELECT p.id, 1, p.unit_price, p.driver_salary, p.allowance
        FROM pricings p
        WHERE NOT EXISTS (
            SELECT 1 FROM pricing_lines pl WHERE pl.pricing_id = p.id
        )
    """))

    # Drop the redundant columns from pricings
    op.drop_column("pricings", "unit_price")
    op.drop_column("pricings", "driver_salary")
    op.drop_column("pricings", "allowance")

    # Drop work_type from pricing_lines (inherited from parent pricings row)
    op.drop_column("pricing_lines", "work_type")


def downgrade() -> None:
    # Restore work_type to pricing_lines (fill from parent)
    op.add_column("pricing_lines", sa.Column("work_type", sa.String(10), nullable=True))
    conn = op.get_bind()
    conn.execute(sa.text("""
        UPDATE pricing_lines pl
        SET work_type = p.work_type
        FROM pricings p
        WHERE pl.pricing_id = p.id
    """))
    op.alter_column("pricing_lines", "work_type", nullable=False)

    # Restore financial columns to pricings (fill from first line)
    op.add_column("pricings", sa.Column("unit_price", sa.Integer(), nullable=True))
    op.add_column("pricings", sa.Column("driver_salary", sa.Integer(), nullable=True))
    op.add_column("pricings", sa.Column("allowance", sa.Integer(), nullable=True))
    conn.execute(sa.text("""
        UPDATE pricings p
        SET
            unit_price   = pl.unit_price,
            driver_salary = pl.driver_salary,
            allowance    = pl.allowance
        FROM (
            SELECT DISTINCT ON (pricing_id) pricing_id, unit_price, driver_salary, allowance
            FROM pricing_lines
            ORDER BY pricing_id, id
        ) pl
        WHERE p.id = pl.pricing_id
    """))
    op.alter_column("pricings", "unit_price", nullable=False, server_default="0")
    op.alter_column("pricings", "driver_salary", nullable=False, server_default="0")
    op.alter_column("pricings", "allowance", nullable=False, server_default="0")
