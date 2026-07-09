"""add ocr_jobs queue table

Revision ID: 0020_add_ocr_jobs
Revises: 0019_ocr_driver_photo_hash
Create Date: 2026-07-09
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "0020_add_ocr_jobs"
down_revision: Union[str, None] = "0019_ocr_driver_photo_hash"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "ocr_jobs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("image_path", sa.String(length=256), nullable=False),
        sa.Column("image_hash", sa.String(length=64), nullable=False),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.Column("result_text", sa.Text(), nullable=True),
        sa.Column(
            "result_payload",
            sa.JSON().with_variant(postgresql.JSONB(), "postgresql"),
            nullable=True,
        ),
        sa.Column("error_message", sa.String(length=1024), nullable=True),
        sa.Column("attempt_count", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("next_retry_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("dead_lettered_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_ocr_jobs_image_hash", "ocr_jobs", ["image_hash"])
    op.create_index("ix_ocr_jobs_status", "ocr_jobs", ["status"])
    op.create_index("ix_ocr_jobs_user_id", "ocr_jobs", ["user_id"])
    op.create_index(
        "ix_ocr_jobs_status_created_at",
        "ocr_jobs",
        ["status", "created_at"],
    )
    op.create_index(
        "ix_ocr_jobs_user_hash_status",
        "ocr_jobs",
        ["user_id", "image_hash", "status"],
    )


def downgrade() -> None:
    op.drop_index("ix_ocr_jobs_user_hash_status", table_name="ocr_jobs")
    op.drop_index("ix_ocr_jobs_status_created_at", table_name="ocr_jobs")
    op.drop_index("ix_ocr_jobs_user_id", table_name="ocr_jobs")
    op.drop_index("ix_ocr_jobs_status", table_name="ocr_jobs")
    op.drop_index("ix_ocr_jobs_image_hash", table_name="ocr_jobs")
    op.drop_table("ocr_jobs")
