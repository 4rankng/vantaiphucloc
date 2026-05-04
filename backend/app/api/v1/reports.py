"""Customer-facing reports for the kế toán role.

Currently exposes the PAN-style monthly settlement workbook
(`Bảng kê thanh toán` + `Sản lượng`).
"""

from __future__ import annotations

import io
import logging
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, require_roles
from app.database import get_db
from app.models.base import User
from app.services.customer_settlement_service import (
    load_settlement_data,
    settlement_period_for,
)
from app.services.excel_pan_bk_sl import (
    generate_pan_bk_sl_workbook,
    settlement_filename,
)

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
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_roles("accountant", "superadmin")),
):
    """Export `BKTT + SL` workbook for a single customer + period.

    The default period mirrors the customer convention: 26th of the previous
    month → 25th of the selected month. Pass `start_date`/`end_date` to
    override.
    """
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
        period_start, period_end = start_date, end_date
    else:
        if year is None or month is None:
            raise HTTPException(
                status_code=400,
                detail="Cần truyền year và month, hoặc start_date và end_date.",
            )
        period_start, period_end = settlement_period_for(year, month)

    try:
        data = await load_settlement_data(db, client_id, period_start, period_end)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    workbook_bytes = generate_pan_bk_sl_workbook(data)
    filename = settlement_filename(data)

    _logger.info(
        "Customer settlement exported: client_id=%s period=%s→%s lines=%d total=%s",
        client_id, period_start, period_end,
        len(data.trip_lines), data.total_with_vat,
    )

    return StreamingResponse(
        io.BytesIO(workbook_bytes),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
