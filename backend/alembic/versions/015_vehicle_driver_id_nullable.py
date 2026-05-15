"""Make Vehicle.driver_id nullable.

The vehicle_drivers junction table is now the source of truth for
driver ↔ vehicle assignments.  The Vehicle.driver_id column is retained
for backward compat but no longer required.

Revision ID: 015
Revises: 014
Create Date: 2026-05-15
"""

from alembic import op
import sqlalchemy as sa

revision = "015"
down_revision = "014"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column(
        "vehicles",
        "driver_id",
        existing_type=sa.Integer(),
        nullable=True,
    )


def downgrade() -> None:
    op.alter_column(
        "vehicles",
        "driver_id",
        existing_type=sa.Integer(),
        nullable=False,
    )
