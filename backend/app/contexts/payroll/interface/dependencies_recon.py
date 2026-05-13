"""FastAPI wiring for customer-reconciliation use cases.

Kept in a separate module to avoid bloating ``dependencies.py``.
"""

from __future__ import annotations

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.contexts.payroll.application.customer_reconciliation import (
    CommitCustomerReconciliationImport,
    GetCustomerReconciliationImport,
    ListCustomerReconciliationImports,
    PreviewCustomerReconciliationImport,
)
from app.database import get_db


def get_preview_customer_reconciliation_import(
    db: AsyncSession = Depends(get_db),
) -> PreviewCustomerReconciliationImport:
    return PreviewCustomerReconciliationImport(db)


def get_commit_customer_reconciliation_import(
    db: AsyncSession = Depends(get_db),
) -> CommitCustomerReconciliationImport:
    return CommitCustomerReconciliationImport(db)


def get_list_customer_reconciliation_imports(
    db: AsyncSession = Depends(get_db),
) -> ListCustomerReconciliationImports:
    return ListCustomerReconciliationImports(db)


def get_customer_reconciliation_import(
    db: AsyncSession = Depends(get_db),
) -> GetCustomerReconciliationImport:
    return GetCustomerReconciliationImport(db)
