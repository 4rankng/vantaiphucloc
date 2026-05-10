"""normalize vendor names and cleanup test data

Revision ID: 003
Revises: 002
Create Date: 2026-05-10

Two data-hygiene fixes:
1. Normalize vendor column: 'Phúc Lộc' → 'Vận Tải Phúc Lộc' on users table.
2. Remove test audit records from clients table (bad data created before
   client-side validation landed).
"""
from alembic import op


revision: str = '003'
down_revision: str | None = '002'
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    op.execute(
        "UPDATE users SET vendor = 'Vận Tải Phúc Lộc' WHERE vendor = 'Phúc Lộc'"
    )
    op.execute(
        "DELETE FROM clients WHERE name LIKE 'Test %Audit%'"
    )


def downgrade() -> None:
    # Reverting the vendor name is not safe (could overwrite legitimate records).
    # Test records cannot be recovered after DELETE.
    pass
