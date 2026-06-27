"""add ocr_driver_requests table

Revision ID: 0015_add_ocr_driver_requests
Revises: 0014_add_original_trip_date
Create Date: 2026-06-27 23:30:00.000000

One row per driver photo-upload (the human OCR action), distinct from
``ocr_requests`` (one row per provider LLM call). Captures the upload count
and the end-to-end latency the driver perceived, powering the admin
driver-experience analytics chart.
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "0015_add_ocr_driver_requests"
down_revision: Union[str, None] = "0014_add_original_trip_date"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "ocr_driver_requests",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "user_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "success",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
        sa.Column(
            "attempts",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),
        sa.Column(
            "numbers_found",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),
        sa.Column("latency_ms", sa.Integer(), nullable=True),
        sa.Column("provider", sa.String(length=16), nullable=True),
    )
    op.create_index(
        "ix_ocr_driver_requests_created_at",
        "ocr_driver_requests",
        ["created_at"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_ocr_driver_requests_created_at", table_name="ocr_driver_requests"
    )
    op.drop_table("ocr_driver_requests")
