"""Settlement use cases."""

from __future__ import annotations

import logging

from app.contexts.billing.application.dto import SettlementExportDTO
from app.contexts.billing.domain.repositories import SettlementDataLoader
from app.contexts.billing.domain.value_objects import SettlementPeriod
from app.contexts.billing.infrastructure.excel_writer import (
    generate_pan_bk_sl_workbook,
    settlement_filename,
)

_logger = logging.getLogger(__name__)


class GenerateCustomerSettlement:
    """Build the BK SL workbook bytes for a (client, period)."""

    def __init__(self, loader: SettlementDataLoader) -> None:
        self.loader = loader

    async def __call__(
        self, *, client_id: int, period: SettlementPeriod
    ) -> SettlementExportDTO:
        data = await self.loader.load(client_id=client_id, period=period)
        workbook_bytes = generate_pan_bk_sl_workbook(data)
        filename = settlement_filename(data)
        _logger.info(
            "Customer settlement exported: client_id=%s period=%s→%s lines=%d total=%s",
            client_id, period.start, period.end,
            len(data.trip_lines), data.total_with_vat,
        )
        return SettlementExportDTO(
            workbook_bytes=workbook_bytes,
            filename=filename,
            line_count=len(data.trip_lines),
            total_with_vat=data.total_with_vat,
        )
