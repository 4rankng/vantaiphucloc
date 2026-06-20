"""add operation_type_aliases table

Revision ID: 0009_add_op_type_aliases
Revises: 0008_drop_pricing_tables
Create Date: 2026-06-08

"""

from datetime import datetime, timezone
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "0009_add_op_type_aliases"
down_revision: Union[str, None] = "0008_drop_pricing_tables"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_NOW = datetime.now(timezone.utc)


def upgrade() -> None:
    op.create_table(
        "operation_type_aliases",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("operation_type_id", sa.Integer(), nullable=False),
        sa.Column("alias", sa.String(length=255), nullable=False),
        sa.Column("alias_normalized", sa.String(length=255), nullable=False),
        sa.Column("source", sa.String(length=30), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_by_id", sa.Integer(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("alias_normalized"),
        sa.ForeignKeyConstraint(
            ["operation_type_id"], ["operation_types.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(["created_by_id"], ["users.id"], ondelete="SET NULL"),
    )
    op.create_index(
        op.f("ix_operation_type_aliases_id"),
        "operation_type_aliases",
        ["id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_operation_type_aliases_operation_type_id"),
        "operation_type_aliases",
        ["operation_type_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_operation_type_aliases_source"),
        "operation_type_aliases",
        ["source"],
        unique=False,
    )

    # Seed common aliases for the 5 existing operation types.
    # Each alias_normalized must be unique — one row per distinct normalized form.
    op.bulk_insert(
        sa.table(
            "operation_type_aliases",
            sa.column("id", sa.Integer),
            sa.column("operation_type_id", sa.Integer),
            sa.column("alias", sa.String),
            sa.column("alias_normalized", sa.String),
            sa.column("source", sa.String),
            sa.column("created_at", sa.DateTime),
        ),
        [
            # XUẤT/NHẬP TÀU (id=1)
            {
                "id": 1,
                "operation_type_id": 1,
                "alias": "XUẤT TÀU",
                "alias_normalized": "XUAT TAU",
                "source": "migration_seed",
                "created_at": _NOW,
            },
            {
                "id": 2,
                "operation_type_id": 1,
                "alias": "NHẬP TÀU",
                "alias_normalized": "NHAP TAU",
                "source": "migration_seed",
                "created_at": _NOW,
            },
            {
                "id": 3,
                "operation_type_id": 1,
                "alias": "XNT",
                "alias_normalized": "XNT",
                "source": "migration_seed",
                "created_at": _NOW,
            },
            {
                "id": 4,
                "operation_type_id": 1,
                "alias": "XUAT/ NHAP TAU",
                "alias_normalized": "XUAT/ NHAP TAU",
                "source": "migration_seed",
                "created_at": _NOW,
            },
            # CHUYỂN BÃI (id=2)
            {
                "id": 5,
                "operation_type_id": 2,
                "alias": "CHUYEN BAI",
                "alias_normalized": "CHUYEN BAI",
                "source": "migration_seed",
                "created_at": _NOW,
            },
            {
                "id": 6,
                "operation_type_id": 2,
                "alias": "CB",
                "alias_normalized": "CB",
                "source": "migration_seed",
                "created_at": _NOW,
            },
            # ĐÓNG KHO (id=3)
            {
                "id": 7,
                "operation_type_id": 3,
                "alias": "DONG KHO",
                "alias_normalized": "DONG KHO",
                "source": "migration_seed",
                "created_at": _NOW,
            },
            {
                "id": 8,
                "operation_type_id": 3,
                "alias": "DK",
                "alias_normalized": "DK",
                "source": "migration_seed",
                "created_at": _NOW,
            },
            # LẤY VỎ HẠ HÀNG (id=4)
            {
                "id": 9,
                "operation_type_id": 4,
                "alias": "LAY VO HA HANG",
                "alias_normalized": "LAY VO HA HANG",
                "source": "migration_seed",
                "created_at": _NOW,
            },
            {
                "id": 10,
                "operation_type_id": 4,
                "alias": "LVHH",
                "alias_normalized": "LVHH",
                "source": "migration_seed",
                "created_at": _NOW,
            },
            {
                "id": 11,
                "operation_type_id": 4,
                "alias": "LAY VO",
                "alias_normalized": "LAY VO",
                "source": "migration_seed",
                "created_at": _NOW,
            },
            # CHẠY SÀ LAN (id=5)
            {
                "id": 12,
                "operation_type_id": 5,
                "alias": "SA LAN",
                "alias_normalized": "SA LAN",
                "source": "migration_seed",
                "created_at": _NOW,
            },
            {
                "id": 13,
                "operation_type_id": 5,
                "alias": "CHAY SA LAN",
                "alias_normalized": "CHAY SA LAN",
                "source": "migration_seed",
                "created_at": _NOW,
            },
            {
                "id": 14,
                "operation_type_id": 5,
                "alias": "CSL",
                "alias_normalized": "CSL",
                "source": "migration_seed",
                "created_at": _NOW,
            },
        ],
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_operation_type_aliases_source"), table_name="operation_type_aliases"
    )
    op.drop_index(
        op.f("ix_operation_type_aliases_operation_type_id"),
        table_name="operation_type_aliases",
    )
    op.drop_index(
        op.f("ix_operation_type_aliases_id"), table_name="operation_type_aliases"
    )
    op.drop_table("operation_type_aliases")
