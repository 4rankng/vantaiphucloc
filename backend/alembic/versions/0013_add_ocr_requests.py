"""add ocr_requests table

Revision ID: 0013_add_ocr_requests
Revises: 0012_add_cont_photo_hash
Create Date: 2026-06-22 20:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "0013_add_ocr_requests"
down_revision: Union[str, None] = "0012_add_cont_photo_hash"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "ocr_requests",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column("provider", sa.String(length=16), nullable=False),
        sa.Column("model", sa.String(length=64), nullable=True),
        sa.Column(
            "success",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
        sa.Column(
            "container_numbers_found",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),
        sa.Column("latency_ms", sa.Integer(), nullable=True),
        sa.Column("error", sa.String(length=512), nullable=True),
        sa.Column(
            "user_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    op.create_index(
        "ix_ocr_requests_created_at",
        "ocr_requests",
        ["created_at"],
    )
    op.create_index(
        "ix_ocr_requests_provider_created_at",
        "ocr_requests",
        ["provider", "created_at"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_ocr_requests_provider_created_at", table_name="ocr_requests"
    )
    op.drop_index("ix_ocr_requests_created_at", table_name="ocr_requests")
    op.drop_table("ocr_requests")
