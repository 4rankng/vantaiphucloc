"""Backfill pickup_location/dropoff_location from route, set NOT NULL

Revision ID: 019
Revises: 018
"""
from alembic import op
import sqlalchemy as sa

revision = "019"
down_revision = "018"


def _parse_route(route_str):
    """Split 'A - B' or 'A → B' into (A, B). Returns (route_str, '') if unparseable."""
    if not route_str:
        return (route_str, "")
    for sep in (" → ", " - ", "->"):
        if sep in route_str:
            parts = route_str.split(sep, 1)
            return (parts[0].strip(), parts[1].strip())
    return (route_str, "")


def upgrade():
    conn = op.get_bind()

    # Backfill routes table
    conn.execute(sa.text("""
        UPDATE routes
        SET pickup_location = split_part(route, ' - ', 1),
            dropoff_location = split_part(route, ' - ', 2)
        WHERE pickup_location IS NULL OR dropoff_location IS NULL
    """))
    # Handle arrow separator for rows still NULL
    conn.execute(sa.text("""
        UPDATE routes
        SET pickup_location = split_part(route, ' → ', 1),
            dropoff_location = split_part(route, ' → ', 2)
        WHERE pickup_location IS NULL OR dropoff_location IS NULL
    """))
    # Fallback: if still NULL, set to empty string
    conn.execute(sa.text("""
        UPDATE routes SET pickup_location = '' WHERE pickup_location IS NULL;
        UPDATE routes SET dropoff_location = '' WHERE dropoff_location IS NULL;
    """))

    op.alter_column('routes', 'pickup_location', nullable=False)
    op.alter_column('routes', 'dropoff_location', nullable=False)


def downgrade():
    op.alter_column('routes', 'dropoff_location', nullable=True)
    op.alter_column('routes', 'pickup_location', nullable=True)
