"""Vietnamese-aware search helpers for SQLAlchemy queries.

Usage
-----
    from app.core.vi_search import vi_ilike

    q = select(ClientORM).where(
        or_(*[vi_ilike(col, search) for col in (ClientORM.name, ClientORM.code)])
    )

``vi_ilike`` wraps both the column and the pattern with PostgreSQL's
``unaccent()`` function before doing a case-insensitive LIKE match, so
typing "Ve" will match "Chùa Vẽ", "Nguyen" matches "Nguyễn", etc.

The ``unaccent`` extension must be enabled (migration 0002_enable_unaccent).
"""

from __future__ import annotations

from sqlalchemy import func
from sqlalchemy.sql.elements import BinaryExpression


def vi_ilike(column, value: str) -> BinaryExpression:
    """Return ``unaccent(column) ILIKE unaccent('%<value>%')``."""
    pattern = f"%{value}%"
    return func.unaccent(column).ilike(func.unaccent(pattern))
