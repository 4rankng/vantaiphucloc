"""Fix operation_types id_seq after bulk-insert seed

The seed migration (487b1eccc88b) used bulk_insert with explicit IDs 1-5
but never advanced the PostgreSQL sequence.  New INSERTs via SQLAlchemy
ORM would get id=4 (or lower) from the sequence and collide.

Revision ID: 0010_fix_ot_seq
Revises: 0009_add_operation_type_aliases
Create Date: 2026-06-08

"""
from alembic import op


revision = "0010_fix_ot_seq"
down_revision = "0009_add_op_type_aliases"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        "SELECT setval('operation_types_id_seq', "
        "COALESCE((SELECT MAX(id) FROM operation_types), 0) + 1, false)"
    )


def downgrade() -> None:
    # No-op: resetting a sequence backward is unsafe.
    pass
