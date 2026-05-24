"""enable_unaccent

Enable the PostgreSQL unaccent extension so that Vietnamese diacritics are
stripped during text search.  This lets queries like "Ve" match "Chùa Vẽ".

Revision ID: 0002_enable_unaccent
Revises: 0001_initial
Create Date: 2026-05-24
"""

from alembic import op

revision: str = "0002_enable_unaccent"
down_revision: str | None = "0001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS unaccent")


def downgrade() -> None:
    op.execute("DROP EXTENSION IF EXISTS unaccent")
