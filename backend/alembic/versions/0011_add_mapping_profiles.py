"""add mapping_profiles table

Revision ID: 0011_add_mapping_profiles
Revises: 0010_fix_ot_seq
Create Date: 2026-06-12

Stores saved column mapping profiles for repeat customer Excel imports.
Keyed by header_signature (hash of header row) so subsequent uploads of
the same template auto-apply the same mapping.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0011_add_mapping_profiles"
down_revision: Union[str, None] = "0010_fix_ot_seq"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "mapping_profiles",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("profile_name", sa.String(64), nullable=False),
        sa.Column("template_filename", sa.String(255), nullable=False),
        sa.Column("header_signature", sa.String(64), nullable=False),
        sa.Column("column_mapping_json", sa.String(), nullable=False),
        sa.Column("pivot_columns_json", sa.String(), nullable=False, server_default="[]"),
        sa.Column("created_by_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("last_used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("use_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["created_by_id"], ["users.id"], ondelete="SET NULL"),
    )
    op.create_index(op.f("ix_mapping_profiles_profile_name"), "mapping_profiles", ["profile_name"], unique=False)
    op.create_index(op.f("ix_mapping_profiles_header_signature"), "mapping_profiles", ["header_signature"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_mapping_profiles_header_signature"), table_name="mapping_profiles")
    op.drop_index(op.f("ix_mapping_profiles_profile_name"), table_name="mapping_profiles")
    op.drop_table("mapping_profiles")
