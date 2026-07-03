"""nullify pre-fix original_cont_number backfill

Revision ID: 0017_null_original_cont
Revises: 0016_add_original_cont_number
Create Date: 2026-07-03

The column ``original_cont_number`` is meant to hold the raw OCR container
string as read by the engine, BEFORE the driver or ISO-6346 auto-correct
edits it — that raw value is what the admin OCR-accuracy metric compares
against the matched ``BookedTrip.cont_number``.

Migration 0016 backfilled the column with ``SET original_cont_number =
cont_number``. For matched rows ``cont_number`` is the post-sync/edited
value, so the backfill captured the corrected value rather than the raw
OCR string. Until the write-path fix shipped, EVERY non-null value was
this meaningless backfill, which made the accuracy metric read ~100% by
construction (snapshot == submitted cont == ground truth).

This migration clears those pre-fix snapshots so the metric's
``original_cont_number IS NOT NULL`` gate excludes them. It is correct to
null every non-null row because, at the moment this runs (before the
corrected capture path serves any request), no genuine raw-OCR snapshot
exists yet — every non-null value is the 0016 backfill. Rows written
after this migration by the fixed path carry a real snapshot and are
never touched (Alembic applies each revision exactly once).
"""

from typing import Sequence, Union

from alembic import op


revision: str = "0017_null_original_cont"
down_revision: Union[str, None] = "0016_add_original_cont_number"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "UPDATE delivered_trips "
        "SET original_cont_number = NULL "
        "WHERE original_cont_number IS NOT NULL"
    )


def downgrade() -> None:
    # Intentionally a no-op. The nulled values were the 0016 best-effort
    # backfill (= cont_number), not real OCR output, so there is nothing
    # meaningful to restore. Re-deriving them as = cont_number would
    # re-introduce the very garbage this migration removes.
    pass
