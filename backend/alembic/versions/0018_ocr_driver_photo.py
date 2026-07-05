"""add ocr_driver_requests.cont_photo_url

Revision ID: 0018_ocr_driver_photo
Revises: 0017_null_original_cont
Create Date: 2026-07-05

Stores the captured photo for an OCR run that the driver saw fail (no
provider rescued a number). Populated ONLY on failure by the OCR endpoint
(``POST /delivered-trips/ocr-container``); successful runs never write a
photo here. Existing rows are unaffected and remain NULL — only failures
observed after this migration ships carry a URL. Powers the admin
"failed-OCR image" viewer so the actual capture can be previewed and
downloaded for diagnosis.
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0018_ocr_driver_photo"
down_revision: Union[str, None] = "0017_null_original_cont"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "ocr_driver_requests",
        sa.Column("cont_photo_url", sa.String(length=256), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("ocr_driver_requests", "cont_photo_url")
