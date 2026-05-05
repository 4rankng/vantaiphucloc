"""FastAPI wiring for the Billing context."""

from __future__ import annotations

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.contexts.billing.application import GenerateCustomerSettlement
from app.contexts.billing.domain.repositories import SettlementDataLoader
from app.contexts.billing.infrastructure.settlement_loader import (
    SqlSettlementDataLoader,
)
from app.database import get_db


def get_settlement_loader(
    db: AsyncSession = Depends(get_db),
) -> SettlementDataLoader:
    return SqlSettlementDataLoader(db)


def get_generate_settlement(
    loader: SettlementDataLoader = Depends(get_settlement_loader),
) -> GenerateCustomerSettlement:
    return GenerateCustomerSettlement(loader)
