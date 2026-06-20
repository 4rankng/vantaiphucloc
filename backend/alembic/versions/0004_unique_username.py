"""enforce unique constraint on users.username

Revision ID: 0004_unique_username
Revises: 0003_driver_salaries
Create Date: 2026-05-30

"""

from typing import Sequence, Union

from alembic import op


revision: str = "0004_unique_username"
down_revision: Union[str, None] = "0003_driver_salaries"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Drop the old non-unique index first, then recreate as unique.
    # NOTE: if duplicate usernames exist in the DB this migration will fail —
    # resolve them manually before running.
    op.drop_index("ix_users_username", table_name="users")
    op.create_index("ix_users_username", "users", ["username"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_users_username", table_name="users")
    op.create_index("ix_users_username", "users", ["username"], unique=False)
