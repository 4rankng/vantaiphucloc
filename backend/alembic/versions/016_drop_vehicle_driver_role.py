"""Drop role column from vehicle_drivers table.

The PRIMARY/SECONDARY driver concept has been removed.  All
vehicle-driver assignments are now equal.

Revision ID: 016
Revises: 015
Create Date: 2026-05-16
"""

from alembic import op
import sqlalchemy as sa

revision = "016"
down_revision = "015"
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    op.add_column(
        "vehicle_drivers",
        sa.Column("role", sa.String(20), server_default="PRIMARY", nullable=False),
    )
