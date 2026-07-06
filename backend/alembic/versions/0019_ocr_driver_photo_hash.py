"""add ocr_driver_requests.cont_photo_hash

Revision ID: 0019_ocr_driver_photo_hash
Revises: 0018_ocr_driver_photo
Create Date: 2026-07-07
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0019_ocr_driver_photo_hash"
down_revision: Union[str, None] = "0018_ocr_driver_photo"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "ocr_driver_requests",
        sa.Column("cont_photo_hash", sa.String(length=64), nullable=True),
    )
    op.create_index(
        "ix_ocr_driver_requests_cont_photo_hash",
        "ocr_driver_requests",
        ["cont_photo_hash"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_ocr_driver_requests_cont_photo_hash",
        table_name="ocr_driver_requests",
    )
    op.drop_column("ocr_driver_requests", "cont_photo_hash")
