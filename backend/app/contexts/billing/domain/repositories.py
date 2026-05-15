"""Billing repository ABCs."""

from __future__ import annotations

from abc import ABC, abstractmethod

from app.contexts.billing.domain.entities import SettlementStatement
from app.contexts.billing.domain.value_objects import SettlementPeriod


class SettlementDataLoader(ABC):
    """Builds a `SettlementStatement` for one (client, period).

    Cross-context read: needs trip orders + containers + matched work-orders +
    location names + client master. The implementation lives in the billing
    infrastructure layer and queries the relevant ORM tables directly.
    """

    @abstractmethod
    async def load(
        self, *, client_id: int, period: SettlementPeriod
    ) -> SettlementStatement: ...
