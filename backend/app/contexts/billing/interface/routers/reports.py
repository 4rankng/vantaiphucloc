"""Customer-facing reporting endpoints (BK SL export)."""

from __future__ import annotations

import io
import logging
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse

from app.contexts.billing.application import GenerateCustomerSettlement
from app.contexts.billing.domain.exceptions import SettlementClientNotFound
from app.contexts.billing.domain.value_objects import (
    SettlementPeriod,
    settlement_period_for,
)
from app.contexts.billing.interface.dependencies import get_generate_settlement
from app.contexts.billing.interface.error_translation import to_http
from app.core.deps import require_roles
from app.models.base import User

_logger = logging.getLogger(__name__)

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/customer-settlement/export")
async def export_customer_settlement(
    client_id: int = Query(..., description="ID khách hàng"),
    year: int | None = Query(None, ge=2020, le=2100),
    month: int | None = Query(None, ge=1, le=12),
    start_date: date | None = Query(
        None,
        description="Ngày bắt đầu (override kỳ); mặc định 26 tháng trước theo year/month.",
    ),
    end_date: date | None = Query(
        None,
        description="Ngày kết thúc (override kỳ); mặc định 25 của year/month.",
    ),
    use_case: GenerateCustomerSettlement = Depends(get_generate_settlement),
    _user: User = Depends(require_roles("accountant", "superadmin")),
):
    if (start_date is None) != (end_date is None):
        raise HTTPException(
            status_code=400,
            detail="Phải truyền cả start_date và end_date, hoặc cả hai cùng để trống.",
        )

    if start_date is not None and end_date is not None:
        if start_date > end_date:
            raise HTTPException(
                status_code=400,
                detail="start_date phải nhỏ hơn hoặc bằng end_date.",
            )
        period = SettlementPeriod(start=start_date, end=end_date)
    else:
        if year is None or month is None:
            raise HTTPException(
                status_code=400,
                detail="Cần truyền year và month, hoặc start_date và end_date.",
            )
        period = settlement_period_for(year, month)

    try:
        result = await use_case(client_id=client_id, period=period)
    except SettlementClientNotFound as exc:
        raise to_http(exc) from exc

    return StreamingResponse(
        io.BytesIO(result.workbook_bytes),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f'attachment; filename="{result.filename}"'
        },
    )
